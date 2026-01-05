from bson import ObjectId
from fastapi import HTTPException
from app.core.database import db
from app.models.knowledge import SavedResult, SourceUpdate
from app.services.vector_service import get_vector_service

class KnowledgeService:
    def __init__(self):
        self.collection = db.get_collection("saved_research")
        self.vector_service = get_vector_service()

    async def save_result(self, result: SavedResult, user_id: str):
        # Check duplicate
        existing = await self.collection.find_one({"url": result.url, "user_id": user_id})
        if existing:
            return {"message": "Result already saved", "id": str(existing["_id"])}

        res_dict = result.model_dump()
        res_dict["user_id"] = user_id
        new_res = await self.collection.insert_one(res_dict)
        doc_id = str(new_res.inserted_id)

        # Upsert to Vector DB (Synchronous call, can be made async/celery later)
        if result.text:
             self.vector_service.upsert(doc_id, user_id, result.title or "Untitled", result.text)

        return {"message": "Saved successfully", "id": doc_id}

    async def get_results(self, user_id: str):
        results = []
        async for res in self.collection.find({"user_id": user_id}):
            res["id"] = str(res["_id"])
            del res["_id"]
            results.append(res)
        return results

    async def get_all_titles(self, user_id: str):
        """Fetch lightweight metadata for all saved sources (no content)."""
        results = []
        # Project only necessary fields
        cursor = self.collection.find(
            {"user_id": user_id},
            {"title": 1, "saved_at": 1, "url": 1}
        ).sort("saved_at", -1)
        
        async for res in cursor:
            results.append({
                "title": res.get("title", "Untitled"),
                "date": res.get("saved_at", ""),
                "url": res.get("url", "")
            })
        return results

    async def update_result(self, id: str, update: SourceUpdate, user_id: str):
        try:
            obj_id = ObjectId(id)
        except:
            raise HTTPException(status_code=400, detail="Invalid ID")
        
        update_data = {k: v for k, v in update.model_dump().items() if v is not None}
        if not update_data:
            return {"message": "No changes"}

        result = await self.collection.update_one(
            {"_id": obj_id, "user_id": user_id},
            {"$set": update_data}
        )
        if result.matched_count == 0:
             raise HTTPException(status_code=404, detail="Result not found")
        return {"message": "Updated"}

    async def delete_result(self, id: str, user_id: str):
        try:
            obj_id = ObjectId(id)
        except:
            raise HTTPException(status_code=400, detail="Invalid ID")

        await self.collection.delete_one({"_id": obj_id, "user_id": user_id})
        self.vector_service.delete(id, user_id)
        return {"message": "Deleted"}

knowledge_service = KnowledgeService()