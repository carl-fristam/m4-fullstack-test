from pydantic import BaseModel
from enum import Enum


class ContextNeed(str, Enum):
    """Determines whether and how much context is needed for a query."""
    HIGH = "high"        # Full library + RAG search needed
    MEDIUM = "medium"    # Library only, no RAG
    MINIMAL = "minimal"  # Minimal context
    NONE = "none"        # Purely conversational, no context


class SessionCategory(str, Enum):
    """Category of session - what type of interaction."""
    CONVERSATION = "conversation"  # Chat with AI about saved sources
    SEARCH = "search"              # EXA search session


class AssistantMode(str, Enum):
    """Assistant behavior mode - what context/persona to use."""
    THESIS = "thesis"    # AML thesis research context
    GENERAL = "general"  # General purpose assistant


class ChatSession(BaseModel):
    title: str
    category: str = SessionCategory.CONVERSATION
    mode: str = AssistantMode.THESIS
    last_message: str | None = None
    user_id: str | None = None
    results: list | None = None  # For search sessions - stores EXA results
    messages: list | None = []


class ChatResultsUpdate(BaseModel):
    results: list


class ChatQuery(BaseModel):
    question: str
    session_id: str | None = None
    mode: str = AssistantMode.THESIS
