from datetime import datetime
from bson import ObjectId
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.core.database import db
from app.models.chat import ChatQuery
from app.services.vector_service import get_vector_service
from app.services.prompt_builder import prompt_builder
from app.services.context_builder import context_builder

class ChatService:
    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.chat_collection = db.get_collection("chat_sessions")
        # Initialize vector service
        self.vector_service = get_vector_service() 

    async def process_query(self, query: ChatQuery, user_id: str):
        # 1. Load History
        conversation_history = []
        if query.session_id:
            session = await self.chat_collection.find_one({
                "_id": ObjectId(query.session_id),
                "user_id": user_id
            })
            if session and session.get("messages"):
                conversation_history = session["messages"][-10:]

        # 2. Build Context (Library + RAG)
        library_context, rag_context, source_titles = await context_builder.build(query.question, user_id)

        # 3. Build System Prompt
        system_message = prompt_builder.build_system_message(library_context, rag_context)
        # 5. Messages
        messages = []
        for msg in conversation_history:
            role = "assistant" if msg["role"] == "ai" else msg["role"]
            messages.append({"role": role, "content": msg.get("text", "")})
        messages.append({"role": "user", "content": query.question})

        # 6. Call LLM
        response = await self.client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=2048,
            system=system_message,
            messages=messages,
            extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"}
        )
        
        full_response = response.content[0].text

        # 7. Save History
        if query.session_id:
             await self.chat_collection.update_one(
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

    async def get_chats(self, user_id: str, chat_type: str = None):
        query = {"user_id": user_id}
        if chat_type:
            query["type"] = chat_type
        
        chats = []
        async for chat in self.chat_collection.find(query).sort("created_at", -1):
            chat["id"] = str(chat["_id"])
            del chat["_id"]
            chats.append(chat)
        return chats

    async def create_chat(self, chat_data, user_id: str):
        chat_dict = chat_data.model_dump()
        chat_dict["user_id"] = user_id
        chat_dict["created_at"] = datetime.utcnow().isoformat()
        chat_dict["messages"] = []
        new_chat = await self.chat_collection.insert_one(chat_dict)
        return {"id": str(new_chat.inserted_id), "message": "Chat created"}

    async def delete_chat(self, id: str, user_id: str):
        try:
             obj_id = ObjectId(id)
        except:
             return {"error": "Invalid ID"}
        await self.chat_collection.delete_one({"_id": obj_id, "user_id": user_id})
        return {"message": "Chat deleted"}

chat_service = ChatService()
