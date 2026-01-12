"""
Migration script to update chat_sessions collection with new field names.

Changes:
- Renames 'type' field to 'category'
- Renames 'context_type' field to 'mode'
- Updates values: "knowledge_base" -> "conversation", "research" -> "search"
- Updates values: "other" -> "general" (thesis stays thesis)

Usage:
    python scripts/migrate_chat_sessions.py

Run from the backend directory.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_DETAILS = os.getenv("MONGO_DETAILS", "mongodb://localhost:27017")
DATABASE_NAME = "research_assistant"


async def migrate():
    print(f"Connecting to MongoDB: {MONGO_DETAILS}")
    client = AsyncIOMotorClient(MONGO_DETAILS)
    db = client[DATABASE_NAME]
    collection = db["chat_sessions"]

    # Get count before migration
    total_docs = await collection.count_documents({})
    print(f"Found {total_docs} documents in chat_sessions collection")

    if total_docs == 0:
        print("No documents to migrate.")
        return

    # Step 1: Migrate 'type' field to 'category'
    print("\n--- Migrating 'type' -> 'category' ---")

    # Update type="knowledge_base" to category="conversation"
    result = await collection.update_many(
        {"type": "knowledge_base"},
        {"$set": {"category": "conversation"}, "$unset": {"type": ""}}
    )
    print(f"  knowledge_base -> conversation: {result.modified_count} documents")

    # Update type="research" to category="search"
    result = await collection.update_many(
        {"type": "research"},
        {"$set": {"category": "search"}, "$unset": {"type": ""}}
    )
    print(f"  research -> search: {result.modified_count} documents")

    # Handle any remaining documents with 'type' field (unknown values)
    result = await collection.update_many(
        {"type": {"$exists": True}},
        [{"$set": {"category": "$type"}}, {"$unset": "type"}]
    )
    if result.modified_count > 0:
        print(f"  other type values migrated: {result.modified_count} documents")

    # Step 2: Migrate 'context_type' field to 'mode'
    print("\n--- Migrating 'context_type' -> 'mode' ---")

    # Update context_type="thesis" to mode="thesis"
    result = await collection.update_many(
        {"context_type": "thesis"},
        {"$set": {"mode": "thesis"}, "$unset": {"context_type": ""}}
    )
    print(f"  thesis -> thesis: {result.modified_count} documents")

    # Update context_type="other" to mode="general"
    result = await collection.update_many(
        {"context_type": "other"},
        {"$set": {"mode": "general"}, "$unset": {"context_type": ""}}
    )
    print(f"  other -> general: {result.modified_count} documents")

    # Handle any remaining documents with 'context_type' field
    result = await collection.update_many(
        {"context_type": {"$exists": True}},
        [{"$set": {"mode": "$context_type"}}, {"$unset": "context_type"}]
    )
    if result.modified_count > 0:
        print(f"  other context_type values migrated: {result.modified_count} documents")

    # Set defaults for documents missing the new fields
    print("\n--- Setting defaults for missing fields ---")

    result = await collection.update_many(
        {"category": {"$exists": False}},
        {"$set": {"category": "conversation"}}
    )
    if result.modified_count > 0:
        print(f"  Set default category=conversation: {result.modified_count} documents")

    result = await collection.update_many(
        {"mode": {"$exists": False}},
        {"$set": {"mode": "thesis"}}
    )
    if result.modified_count > 0:
        print(f"  Set default mode=thesis: {result.modified_count} documents")

    # Verification
    print("\n--- Verification ---")
    conversation_count = await collection.count_documents({"category": "conversation"})
    search_count = await collection.count_documents({"category": "search"})
    thesis_count = await collection.count_documents({"mode": "thesis"})
    general_count = await collection.count_documents({"mode": "general"})

    print(f"  category=conversation: {conversation_count}")
    print(f"  category=search: {search_count}")
    print(f"  mode=thesis: {thesis_count}")
    print(f"  mode=general: {general_count}")

    # Check for any leftover old fields
    old_type = await collection.count_documents({"type": {"$exists": True}})
    old_context = await collection.count_documents({"context_type": {"$exists": True}})

    if old_type > 0 or old_context > 0:
        print(f"\n  WARNING: Found documents with old fields still present!")
        print(f"    'type' field: {old_type}")
        print(f"    'context_type' field: {old_context}")
    else:
        print("\n  Migration completed successfully!")

    client.close()


if __name__ == "__main__":
    asyncio.run(migrate())
