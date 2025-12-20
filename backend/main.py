from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

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
    return {"status": "ok"}

@app.post("/tasks")
async def create_task(task: Task):
    return {"message": "Success", "task": task}