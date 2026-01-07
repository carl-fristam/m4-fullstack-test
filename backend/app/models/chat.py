from pydantic import BaseModel
from enum import Enum

class ContextNeed(str, Enum):
    """Determines whether and how much context is needed for a query."""
    HIGH = "high"        # Full library + RAG search needed
    MEDIUM = "medium"    # Library only, no RAG
    MINIMAL = "minimal"  # Minimal context
    NONE = "none"        # Purely conversational, no context

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
    chat_type: str = "thesis"  # "thesis" or "other"