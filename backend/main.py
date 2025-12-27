from bson import ObjectId
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import db_config
from auth import oauth2_scheme, auth_handler
from exa_py import Exa

app = FastAPI()

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
# Note: In production, use environment variables for keys
exa = Exa(api_key="9b7e3266-153c-4a25-b78a-dd4f688ded42")

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
    return {"message": "Deleted"}

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
