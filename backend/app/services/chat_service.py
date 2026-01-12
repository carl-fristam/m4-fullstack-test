from datetime import datetime
from bson import ObjectId
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.core.database import db
from app.models.chat import ChatQuery, AssistantMode
from app.services.vector_service import get_vector_service
from app.services.prompt_builder import prompt_builder
from app.services.context_builder import context_builder
from app.services.query_classifier import query_classifier


class ChatService:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.collection = db.get_collection("chat_sessions")
        self.vector_service = get_vector_service()

    async def process_query(self, query: ChatQuery, user_id: str):
        """Process a user query and return AI response."""
        # 1. Load conversation history and session mode
        conversation_history = []
        session_mode = AssistantMode.THESIS

        if query.session_id:
            session = await self.collection.find_one({
                "_id": ObjectId(query.session_id),
                "user_id": user_id
            })
            if session:
                if session.get("messages"):
                    conversation_history = session["messages"][-10:]
                session_mode = session.get("mode", AssistantMode.THESIS)

        # 2. Classify query intent
        context_need = await query_classifier.classify(query.question, conversation_history)

        # 3. Build context based on intent
        library_context, rag_context, source_titles = await context_builder.build(
            query.question,
            user_id,
            context_need=context_need
        )

        # 4. Build system prompt using session's mode
        system_message = prompt_builder.build_system_message(library_context, rag_context, session_mode)

        # 5. Format messages for API
        messages = []
        for msg in conversation_history:
            role = "assistant" if msg["role"] == "ai" else msg["role"]
            messages.append({"role": role, "content": msg.get("text", "")})
        messages.append({"role": "user", "content": query.question})

        # 6. Call LLM
        response = await self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=8192,
            system=system_message,
            messages=messages,
            extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"}
        )

        full_response = response.content[0].text

        # 7. Save to history
        if query.session_id:
            await self.collection.update_one(
                {"_id": ObjectId(query.session_id)},
                {
                    "$push": {
                        "messages": {
                            "$each": [
                                {"role": "user", "text": query.question, "timestamp": datetime.utcnow().isoformat()},
                                {"role": "ai", "text": full_response, "timestamp": datetime.utcnow().isoformat(), "sources": source_titles}
                            ]
                        }
                    },
                    "$set": {"last_message": query.question}
                }
            )

        return {"response": full_response, "sources_used": source_titles}

    async def get_sessions(self, user_id: str, category: str = None):
        """Get all sessions for a user, optionally filtered by category."""
        query = {"user_id": user_id}
        if category:
            query["category"] = category

        sessions = []
        async for session in self.collection.find(query).sort("created_at", -1):
            session["id"] = str(session["_id"])
            del session["_id"]
            sessions.append(session)
        return sessions

    async def create_session(self, session_data, user_id: str):
        """Create a new chat session."""
        session_dict = session_data.model_dump()
        session_dict["user_id"] = user_id
        session_dict["created_at"] = datetime.utcnow().isoformat()
        session_dict["messages"] = []
        new_session = await self.collection.insert_one(session_dict)
        return {"id": str(new_session.inserted_id)}

    async def delete_session(self, session_id: str, user_id: str):
        """Delete a chat session."""
        try:
            obj_id = ObjectId(session_id)
        except:
            return {"error": "Invalid ID"}
        await self.collection.delete_one({"_id": obj_id, "user_id": user_id})
        return {"message": "Session deleted"}

    async def update_session_results(self, session_id: str, user_id: str, results: list):
        """Update search results for a session (used by EXA search)."""
        try:
            obj_id = ObjectId(session_id)
        except:
            return {"error": "Invalid ID"}
        await self.collection.update_one(
            {"_id": obj_id, "user_id": user_id},
            {"$set": {"results": results}}
        )
        return {"message": "Results updated"}


chat_service = ChatService()
