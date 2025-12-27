import motor.motor_asyncio
import os
from dotenv import load_dotenv, find_dotenv

load_dotenv(find_dotenv())

# Inside Docker-Compose, the hostname 'mongo' matches our service name
# Locally, it would be 'localhost'
MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb://localhost:27017")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS)
database = client.research_db

# Collection for saved research results
saved_results_collection = database.get_collection("saved_research")
chat_collection = database.get_collection("chat_sessions")

def result_helper(result) -> dict:
    return {
        "id": str(result["_id"]),
        "title": result.get("title"),
        "url": result.get("url"),
        "text": result.get("text"), 
        "saved_at": result.get("saved_at"),
        "tags": result.get("tags", []),
        "is_favorite": result.get("is_favorite", False),
        "note": result.get("note")
    }

def chat_helper(chat) -> dict:
    return {
        "id": str(chat["_id"]),
        "title": chat.get("title", "New Chat"),
        "created_at": chat.get("created_at"),
        "last_message": chat.get("last_message", ""),
        "results": chat.get("results", [])
    }
