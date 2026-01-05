from pydantic import BaseModel

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
    session_id: str | None = None