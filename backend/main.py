from bson import ObjectId
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import db_config
from auth import oauth2_scheme, auth_handler

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