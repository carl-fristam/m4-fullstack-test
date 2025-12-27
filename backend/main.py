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
    last_message: str | None = None
    user_id: str | None = None
    results: list | None = None

class ChatResultsUpdate(BaseModel):
    results: list

class ChatQuery(BaseModel):
    question: str

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
    # Verify the user
    user_id = auth_handler.decode_token(token)

    # --- STAGE 1: SCANNING (50 candidates for better TPM stability) ---
    search_results = vector_db.search_documents(query.question, user_id, n_results=50)
    
    # Filter by similarity threshold to avoid pulling junk context for small talk (e.g. "thanks!")
    # Lowered threshold to 0.15 for better sensitivity
    relevant_results = [res for res in search_results if res.get("score", 0) > 0.15]
    
    selected_full_context = []
    source_titles = []

    if not relevant_results:
        # If no relevant research, skip to Stage 3 with NO context
        print(f"No relevant research found for query: {query.question}. Transitioning to general chat mode.")
        context_text = "No relevant saved research sources were found for this query."
    else:
        # --- STAGE 2: INTELLIGENT SELECTION ---
        candidates = []
        for res in relevant_results:
            candidates.append({
                "id": res["id"],
                "title": res["metadata"].get("title", "Untitled"),
                "snippet": res["text"][:300] if res["text"] else ""
            })

        selection_prompt = (
            "You are a selection agent. Below is a list of search results with IDs, titles, and short snippets. "
            "Identify the top 10 most relevant results that can answer the following question. "
            "Return ONLY a JSON list of the IDs. No other text.\n\n"
            f"Question: {query.question}\n"
            f"Candidates: {json.dumps(candidates)}"
        )

        try:
            selection_res = await anthropic_client.messages.create(
                model=os.getenv("HAIKU_MODEL", "claude-3-5-haiku-20241022"),
                max_tokens=400,
                messages=[{"role": "user", "content": selection_prompt}]
            )
            selected_ids_text = selection_res.content[0].text
            if '[' in selected_ids_text:
                selected_ids_text = selected_ids_text[selected_ids_text.find('['):selected_ids_text.rfind(']')+1]
            selected_ids = json.loads(selected_ids_text)
        except Exception as e:
            print(f"Selection Error/Rate Limit: {e}. Falling back to top-10.")
            selected_ids = [c["id"] for c in candidates[:10]]

        # --- STAGE 3: PREPARE CONTEXT ---
        results_map = {res["id"]: res for res in relevant_results}
        for sid in selected_ids:
            if sid in results_map:
                res = results_map[sid]
                title = res["metadata"].get("title", "Untitled")
                text_deep = res["text"][:3500] if res["text"] else ""
                selected_full_context.append(f"Source: {title}\nContent: {text_deep}")
                source_titles.append(title)
        context_text = "\n\n---\n\n".join(selected_full_context)
    
    # Final Generation
    system_prompt = (
        "You are a research assistant. If research sources are provided, use them to answer. "
        "If the query is a simple greeting, thank you, or general question not covered by research, "
        "respond naturally as a helpful AI assistant. Do NOT claim you have no research if the user just said 'thanks'. "
        "Do NOT list sources at the end. Use [SHOW_SOURCES] at the very end only if you used specific research results."
    )
    
    user_content = f"""RESEARCH CONTEXT:
---
{context_text}
---
USER QUESTION: {query.question}"""

    async def event_generator():
        # Step 1: Send metadata (sources)
        yield f"metadata:{json.dumps({'sources_used': source_titles})}\n\n"
        
        try:
            # Step 2: Stream content from Anthropic
            async with anthropic_client.messages.stream(
                model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20250929"),
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_content}]
            ) as stream:
                async for text in stream.text_stream:
                    yield f"content:{text}\n\n"
                    await asyncio.sleep(0.01) # Small delay for smoother frontend rendering
        except Exception as e:
            print(f"Streaming Error: {e}")
            yield f"error:Failed to generate AI response: {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- CHAT SESSIONS ---

@app.get("/chats")
async def get_chats(token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    chats = []
    async for chat in db_config.chat_collection.find({"user_id": user_id}).sort("created_at", -1):
        chats.append(db_config.chat_helper(chat))
    return chats

@app.post("/chats")
async def create_chat(chat: ChatSession, token: str = Depends(oauth2_scheme)):
    user_id = auth_handler.decode_token(token)
    
    new_chat = await db_config.chat_collection.insert_one({
        "title": chat.title,
        "created_at": datetime.utcnow().isoformat(),
        "last_message": chat.last_message,
        "user_id": user_id,
        "results": chat.results or []
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
