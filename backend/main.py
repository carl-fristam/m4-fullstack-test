from bson import ObjectId
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import db_config

app = FastAPI()

# Wide open CORS for testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Task(BaseModel):
    title: str
    description: str | None = None
    priority: int

@app.get("/")
async def root():
    # Updated message so you know for sure the new code is live
    return {"status": "online", "message": "FastAPI + MongoDB is humming"}

@app.get("/tasks")
async def get_tasks():
    tasks = []
    # cursor is a stream of data from Mongo
    async for task in db_config.task_collection.find():
        tasks.append(db_config.task_helper(task))
    return tasks

@app.post("/tasks")
async def create_task(task: Task):
    # Use model_dump() for Pydantic v2 compatibility
    task_dict = task.model_dump()
    
    # Insert into MongoDB
    new_task = await db_config.task_collection.insert_one(task_dict)
    
    # Find the newly created task to return it
    created_task = await db_config.task_collection.find_one({"_id": new_task.inserted_id})
    return db_config.task_helper(created_task)

@app.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    # Convert string ID to MongoDB ObjectId
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # Perform the deletion
    delete_result = await db_config.task_collection.delete_one({"_id": obj_id})

    if delete_result.deleted_count == 1:
        return {"message": "Task deleted successfully"}
    
    raise HTTPException(status_code=404, detail="Task not found")