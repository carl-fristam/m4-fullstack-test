from fastapi import APIRouter, Depends, HTTPException
from app.api import deps
from app.models.chat import ChatQuery, ChatSession, ChatResultsUpdate
from app.services.chat_service import chat_service

router = APIRouter()


@router.get("/")
async def get_sessions(category: str = None, user_id: str = Depends(deps.get_current_user)):
    """Get all chat sessions, optionally filtered by category (conversation/search)."""
    return await chat_service.get_sessions(user_id, category)


@router.post("/")
async def create_session(session: ChatSession, user_id: str = Depends(deps.get_current_user)):
    """Create a new chat session."""
    return await chat_service.create_session(session, user_id)


@router.delete("/{session_id}")
async def delete_session(session_id: str, user_id: str = Depends(deps.get_current_user)):
    """Delete a chat session."""
    result = await chat_service.delete_session(session_id, user_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/query")
async def send_query(query: ChatQuery, user_id: str = Depends(deps.get_current_user)):
    """Send a message to the AI assistant."""
    return await chat_service.process_query(query, user_id)


@router.put("/{session_id}/results")
async def update_session_results(session_id: str, update: ChatResultsUpdate, user_id: str = Depends(deps.get_current_user)):
    """Update search results for a session (used by EXA search)."""
    result = await chat_service.update_session_results(session_id, user_id, update.results)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result
