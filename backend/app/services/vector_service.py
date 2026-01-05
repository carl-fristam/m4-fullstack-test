import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer
from app.core.config import settings

# Global Instance for Singelton Access
_vector_store_instance = None

class VectorService:
    def __init__(self):
        self.filename = "vectors.json"
        self.model_name = "all-MiniLM-L6-v2"
        self.data = []
        self._model = None
        self.load()

    @property
    def model(self):
        if not self._model:
            print(f"Loading Embedding Model: {self.model_name}")
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def load(self):
        if os.path.exists(self.filename):
            try:
                with open(self.filename, 'r') as f:
                    self.data = json.load(f)
                print(f"Service Loaded {len(self.data)} vectors")
            except Exception as e:
                print(f"Error loading vectors: {e}")
                self.data = []

    def save(self):
        with open(self.filename, 'w') as f:
            json.dump(self.data, f)

    def get_embedding(self, text: str):
        return self.model.encode(text).tolist()

    def upsert(self, doc_id: str, user_id: str, title: str, text: str):
        # Remove existing
        self.data = [d for d in self.data if not (d['id'] == doc_id)]
        
        combined_text = f"{title}: {text}"
        embedding = self.get_embedding(combined_text)
        
        self.data.append({
            "id": doc_id,
            "user_id": user_id,
            "title": title,
            "text": text,
            "embedding": embedding
        })
        self.save()
        print(f"Upserted {doc_id}")

    def delete(self, doc_id: str, user_id: str):
        initial_len = len(self.data)
        self.data = [d for d in self.data if not (d['id'] == doc_id and d['user_id'] == user_id)]
        if len(self.data) < initial_len:
            self.save()

    def search(self, query: str, user_id: str, n_results: int = 5):
        if not self.data:
            return []
            
        user_data = [d for d in self.data if d.get('user_id') == user_id]
        if not user_data:
            return []

        query_vec = np.array(self.get_embedding(query))
        embeddings = np.array([d['embedding'] for d in user_data])
        
        # Cosine Similarity
        norm_data = np.linalg.norm(embeddings, axis=1)
        norm_query = np.linalg.norm(query_vec)
        denominators = norm_data * norm_query
        similarities = np.dot(embeddings, query_vec) / (denominators + 1e-9)
        
        k = min(n_results, len(user_data))
        top_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in top_indices:
            res = user_data[idx]
            results.append({
                "id": res["id"],
                "text": res["text"],
                "metadata": {"title": res["title"]},
                "score": float(similarities[idx])
            })
        return results

def get_vector_service():
    global _vector_store_instance
    if _vector_store_instance is None:
        _vector_store_instance = VectorService()
    return _vector_store_instance