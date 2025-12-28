from bson import ObjectId
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import db_config
from auth import oauth2_scheme, auth_handler
from exa_py import Exa
import vector_db
import anthropic
from anthropic import AsyncAnthropic
import os
from dotenv import load_dotenv, find_dotenv

# Load environment variables
load_dotenv(find_dotenv())

app = FastAPI()

# Wide open CORS for development
# ... (rest of imports and setup)

# Wide open CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---

class UserCredentials(BaseModel):
    username: str
    password: str

class SavedResult(BaseModel):
    title: str | None = None
    url: str
    text: str | None = None
    saved_at: str | None = None
    tags: list[str] = []
    is_favorite: bool = False
    note: str | None = None
    user_id: str | None = None

class SourceUpdate(BaseModel):
    tags: list[str] | None = None
    is_favorite: bool | None = None
    note: str | None = None

class ChatSession(BaseModel):
    title: str
    type: str = "knowledge_base"  # "knowledge_base" or "research"
    last_message: str | None = None
    user_id: str | None = None
    results: list | None = None
    messages: list | None = []

class ChatResultsUpdate(BaseModel):
    results: list

class ChatQuery(BaseModel):
    question: str
    session_id: str | None = None  # Optional session ID for conversation context

# Helper for the users collection
user_collection = db_config.database.get_collection("users")

# --- PUBLIC ROUTES ---

@app.get("/")
async def root():
    return {"status": "online", "message": "FastAPI + MongoDB is humming"}

@app.post("/register")
async def register(auth_details: UserCredentials):
    existing_user = await user_collection.find_one({"username": auth_details.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    hashed_pwd = auth_handler.get_password_hash(auth_details.password)
    await user_collection.insert_one({
        "username": auth_details.username, 
        "password": hashed_pwd
    })
    return {"message": "User created"}

@app.post("/login")
async def login(auth_details: UserCredentials):
    user = await user_collection.find_one({"username": auth_details.username})
    
    if not user or not auth_handler.verify_password(auth_details.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = auth_handler.create_access_token(data={"sub": auth_details.username})
    return {"access_token": token, "token_type": "bearer"}

# --- PROTECTED ROUTES ---



# --- EXA AI SEARCH ---
exa = Exa(api_key=os.getenv("EXA_API_KEY"))

@app.get("/exa-search")
async def exa_search(query: str, token: str = Depends(oauth2_scheme)):
    # Verify the user
    auth_handler.decode_token(token)

    try:
        result = exa.search_and_contents(
            query,
            category="research paper",
            num_results=15,
            text=True,
            type="auto"
        )
        return result
    except Exception as e:

        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/saved-results")
async def save_result(result: SavedResult, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    # Check for existing result FOR THIS USER
    existing = await db_config.saved_results_collection.find_one({
        "url": result.url,
        "user_id": user_id
    })
    if existing:
         return {"message": "Result already saved", "id": str(existing["_id"])}

    res_dict = result.model_dump()
    res_dict["user_id"] = user_id
    new_res = await db_config.saved_results_collection.insert_one(res_dict)

    doc_id = str(new_res.inserted_id)
    vector_db.upsert_document(doc_id, user_id, result.title, result.text)

    return {"message": "Saved successfully", "id": str(new_res.inserted_id)}

@app.get("/saved-results")
async def get_saved_results(token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    results = []
    async for res in db_config.saved_results_collection.find({"user_id": user_id}):
        results.append(db_config.result_helper(res))
    return results

@app.put("/saved-results/{id}")
async def update_result(id: str, update: SourceUpdate, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        return {"message": "No changes"}

    result = await db_config.saved_results_collection.update_one(
        {"_id": obj_id, "user_id": user_id}, 
        {"$set": update_data}
    )
    if result.modified_count == 0:
         raise HTTPException(status_code=404, detail="Result not found or not owned by user")
    return {"message": "Updated"}

@app.delete("/saved-results/{id}")
async def delete_result(id: str, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    await db_config.saved_results_collection.delete_one({"_id": obj_id, "user_id": user_id})

    vector_db.delete_document(id)

    return {"message": "Deleted"}

# --- LLM ROUTES ---

anthropic_client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

@app.post("/chat-query")
async def chat_query(query: ChatQuery, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)

    # STEP 1: Load conversation history (if session exists)
    conversation_history = []
    if query.session_id:
        try:
            session = await db_config.chat_collection.find_one({
                "_id": ObjectId(query.session_id),
                "user_id": user_id
            })
            if session and session.get("messages"):
                conversation_history = session["messages"][-10:]
                print(f"Loaded {len(conversation_history)} messages from session")
        except Exception as e:
            print(f"Error loading session: {e}")

    # STEP 2: Get ALL saved sources for context
    total_sources = await db_config.saved_results_collection.count_documents({"user_id": user_id})
    
    all_sources = []
    async for res in db_config.saved_results_collection.find({"user_id": user_id}).limit(100):
        all_sources.append({
            "title": res.get("title", "Untitled"),
            "url": res.get("url", ""),
            "text": res.get("text", "")[:3000]  # First 3k chars
        })
    
    # STEP 3: Search sources by relevance to question
    search_results = vector_db.search_documents(query.question, user_id, n_results=100)
    relevant_results = [res for res in search_results if res.get("score", 0) > 0.2]
    
    # STEP 4: Build context with relevant sources
    MAX_CONTEXT_TOKENS = 50000
    CHARS_PER_TOKEN = 4
    
    selected_sources = []
    source_titles = []
    current_tokens = 0
    
    for res in relevant_results:
        title = res["metadata"].get("title", "Untitled")
        text = res["text"][:5000] if res["text"] else ""
        
        source_text = f"Source: {title}\nContent: {text}\n\n---\n\n"
        estimated_tokens = len(source_text) // CHARS_PER_TOKEN
        
        if current_tokens + estimated_tokens <= MAX_CONTEXT_TOKENS:
            selected_sources.append(source_text)
            source_titles.append(title)
            current_tokens += estimated_tokens
        else:
            break
    
    # STEP 5: Build research context
    if selected_sources:
        research_context = "".join(selected_sources)
    else:
        # If no relevant sources, provide ALL sources with full content
        fallback_sources = []
        fallback_tokens = 0
        
        for s in all_sources:
            source_text = f"Source: {s['title']}\nURL: {s['url']}\nContent: {s['text']}\n\n---\n\n"
            estimated_tokens = len(source_text) // CHARS_PER_TOKEN
            
            if fallback_tokens + estimated_tokens <= MAX_CONTEXT_TOKENS:
                fallback_sources.append(source_text)
                fallback_tokens += estimated_tokens
            else:
                break
        
        research_context = f"User has {total_sources} saved sources:\n\n" + "".join(fallback_sources) if fallback_sources else f"User has {total_sources} saved sources."
    
    # STEP 6: Build messages for Claude
    messages = []
    
    # Add conversation history
    for msg in conversation_history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    # Add current question with research context
    user_content = f"""RESEARCH CONTEXT:
---
{research_context}
---

USER QUESTION: {query.question}"""
    
    messages.append({
        "role": "user",
        "content": user_content
    })
    
    # STEP 7: System prompt - let Claude be intelligent
    system_prompt = (
        "You are a research assistant with access to the user's saved research sources. "
        "Use the provided sources to answer questions when relevant. "
        "If the user asks about their sources (how many, what topics, grouping, etc.), use the source list provided. "
        "If the user asks a general question, respond naturally and conversationally. "
        "If the user asks about specific research topics, use the relevant source content. "
        "IMPORTANT: Always use clear, well-structured markdown formatting:\n"
        "- Use ## for main headings\n"
        "- Use **bold** for emphasis\n"
        "- Use numbered lists (1., 2., 3.) for ordered items\n"
        "- Use bullet points (- ) for unordered lists\n"
        "- Keep formatting clean and consistent\n"
        "Be helpful, intelligent, and context-aware. Use [SHOW_SOURCES] at the end only if you referenced specific sources."
    )
    
    # Debug logging
    print(f"Query: '{query.question}'")
    print(f"Total sources: {total_sources}")
    print(f"Relevant sources found: {len(relevant_results)}")
    print(f"Sources in context: {len(selected_sources)}")
    print(f"Conversation history: {len(conversation_history)} messages")

    # Get complete response from Claude (no streaming to avoid character issues)
    try:
        response = await anthropic_client.messages.create(
            model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929"),
            max_tokens=2048,
            system=system_prompt,
            messages=messages
        )
        
        full_response = response.content[0].text
        
        # Save to session
        if query.session_id and full_response:
            try:
                await db_config.chat_collection.update_one(
                    {"_id": ObjectId(query.session_id), "user_id": user_id},
                    {
                        "$push": {
                            "messages": {
                                "$each": [
                                    {
                                        "role": "user",
                                        "content": query.question,
                                        "timestamp": datetime.utcnow().isoformat()
                                    },
                                    {
                                        "role": "assistant",
                                        "content": full_response,
                                        "timestamp": datetime.utcnow().isoformat(),
                                        "sources_used": source_titles
                                    }
                                ]
                            }
                        },
                        "$set": {"last_message": query.question}
                    }
                )
                print(f"Saved conversation to session")
            except Exception as e:
                print(f"Error saving to session: {e}")
        
        return {
            "response": full_response,
            "sources_used": source_titles
        }
        
    except Exception as e:
        print(f"Claude API Error: {e}")
@app.get("/chats")
async def get_chats(type: str | None = None, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    query = {"user_id": user_id}
    if type:
        query["type"] = type

    chats = []
    async for chat in db_config.chat_collection.find(query).sort("created_at", -1):
        chats.append(db_config.chat_helper(chat))
    return chats

@app.post("/chats")
async def create_chat(chat: ChatSession, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    new_chat = await db_config.chat_collection.insert_one({
        "title": chat.title,
        "type": chat.type,
        "created_at": datetime.utcnow().isoformat(),
        "last_message": chat.last_message,
        "user_id": user_id,
        "results": chat.results or [],
        "messages": chat.messages or []
    })
    return {"id": str(new_chat.inserted_id), "message": "Chat created"}

@app.put("/chats/{id}/results")
async def update_chat_results(id: str, data: ChatResultsUpdate, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    await db_config.chat_collection.update_one(
        {"_id": obj_id, "user_id": user_id},
        {"$set": {"results": data.results}}
    )
    return {"message": "Results updated"}

@app.delete("/chats/{id}")
async def delete_chat(id: str, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    await db_config.chat_collection.delete_one({"_id": obj_id, "user_id": user_id})
    return {"message": "Chat deleted"}
