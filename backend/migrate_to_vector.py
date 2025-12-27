import asyncio
import db_config
import vector_db
async def migrate():
    print("Starting migration from MongoDB to Vector DB...")
    
    # 1. Fetch all saved research
    cursor = db_config.saved_results_collection.find({})
    count = 0
    
    async for doc in cursor:
        doc_id = str(doc["_id"])
        title = doc.get("title", "Untitled")
        text = doc.get("text", "") # This is the abstract/content
        
        print(f"Embedding: {title}...")
        
        # 2. Push to Vector DB
        vector_db.upsert_document(doc_id, title, text)
        count += 1
        
    print(f"\nMigration complete! Moved {count} documents.")
if __name__ == "__main__":
    asyncio.run(migrate())