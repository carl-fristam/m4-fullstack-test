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
class Task(BaseModel):
    title: str
    description: str | None = ""
    priority: int = 1

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

class SourceUpdate(BaseModel):
    tags: list[str] | None = None
    is_favorite: bool | None = None

class ChatSession(BaseModel):
    title: str
    last_message: str | None = None

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

@app.get("/tasks")
async def get_tasks(token: str = Depends(oauth2_scheme)):
    # Verify the user
    auth_handler.decode_token(token)
    
    tasks = []
    async for task in db_config.task_collection.find():
        tasks.append(db_config.task_helper(task))
    return tasks

@app.post("/tasks")
async def create_task(task: Task, token: str = Depends(oauth2_scheme)):
    # Verify the user
    auth_handler.decode_token(token)

    task_dict = task.model_dump()
    new_task = await db_config.task_collection.insert_one(task_dict)
    created_task = await db_config.task_collection.find_one({"_id": new_task.inserted_id})
    return db_config.task_helper(created_task)

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str, token: str = Depends(oauth2_scheme)):
    # FIX: Verify user via token header, not query
    auth_handler.decode_token(token)

    try:
        obj_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    delete_result = await db_config.task_collection.delete_one({"_id": obj_id})
    if delete_result.deleted_count == 1:
        return {"message": "Task deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Task not found")

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
        print(f"Exa Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
@app.post("/saved-results")
async def save_result(result: SavedResult, token: str = Depends(oauth2_scheme)):
    auth_handler.decode_token(token)
    
    # Simple check to avoid duplicates if desired, or just insert
    existing = await db_config.saved_results_collection.find_one({"url": result.url})
    if existing:
         return {"message": "Result already saved", "id": str(existing["_id"])}

    res_dict = result.model_dump()
    new_res = await db_config.saved_results_collection.insert_one(res_dict)
    return {"message": "Saved successfully", "id": str(new_res.inserted_id)}

@app.get("/saved-results")
async def get_saved_results(token: str = Depends(oauth2_scheme)):
    auth_handler.decode_token(token)
    results = []
    async for res in db_config.saved_results_collection.find():
        results.append(db_config.result_helper(res))
    return results

@app.put("/saved-results/{id}")
async def update_result(id: str, update: SourceUpdate, token: str = Depends(oauth2_scheme)):
    auth_handler.decode_token(token)
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        return {"message": "No changes"}

    await db_config.saved_results_collection.update_one({"_id": obj_id}, {"$set": update_data})
    return {"message": "Updated"}

@app.delete("/saved-results/{id}")
async def delete_result(id: str, token: str = Depends(oauth2_scheme)):
    auth_handler.decode_token(token)
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    await db_config.saved_results_collection.delete_one({"_id": obj_id})
    return {"message": "Deleted"}

# --- CHAT SESSIONS ---

@app.get("/chats")
async def get_chats(token: str = Depends(oauth2_scheme)):
    auth_handler.decode_token(token)
    chats = []
    async for chat in db_config.chat_collection.find().sort("created_at", -1):
        chats.append(db_config.chat_helper(chat))
    return chats

@app.post("/chats")
async def create_chat(chat: ChatSession, token: str = Depends(oauth2_scheme)):
    auth_handler.decode_token(token)
    new_chat = await db_config.chat_collection.insert_one({
        "title": chat.title,
        "created_at": datetime.utcnow().isoformat(),
        "last_message": chat.last_message
    })
    return {"id": str(new_chat.inserted_id), "message": "Chat created"}

@app.delete("/chats/{id}")
async def delete_chat(id: str, token: str = Depends(oauth2_scheme)):
    auth_handler.decode_token(token)
    try:
        obj_id = ObjectId(id)
    except:
        raise HTTPException(status_code=400, detail="Invalid ID")
    await db_config.chat_collection.delete_one({"_id": obj_id})
    return {"message": "Chat deleted"}
