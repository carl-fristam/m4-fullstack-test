import numpy as np
import json
import os
from sentence_transformers import SentenceTransformer

# --- CONFIGURATION ---
VECTOR_DB_FILE = "vectors.json"
MODEL_NAME = "all-MiniLM-L6-v2"

print(f"Initializing Vector DB & Loading Model ({MODEL_NAME})...")
model = SentenceTransformer(MODEL_NAME)

class LocalVectorStore:
    def __init__(self, filename):
        self.filename = filename
        self.data = [] # List of {id, title, text, embedding}
        self.load()

    def load(self):
        if os.path.exists(self.filename):
            try:
                with open(self.filename, 'r') as f:
                    self.data = json.load(f)
                print(f"Loaded {len(self.data)} documents from {self.filename}")
            except Exception as e:
                print(f"Error loading vector DB: {e}")
                self.data = []

    def save(self):
        with open(self.filename, 'w') as f:
            # json.dump handles lists OK, but embeddings might be numpy arrays in memory if we aren't careful.
            # We ensure they are lists before saving.
            json.dump(self.data, f)

    def upsert(self, doc_id, user_id, title, text, embedding):
        # Remove if exists (naive implementation)
        self.data = [d for d in self.data if not (d['id'] == doc_id)]
        
        # Ensure embedding is a list for JSON serialization
        if isinstance(embedding, np.ndarray):
            embedding = embedding.tolist()
            
        self.data.append({
            "id": doc_id,
            "user_id": user_id,
            "title": title,
            "text": text,
            "embedding": embedding
        })
        self.save()

    def delete(self, doc_id, user_id):
        initial_len = len(self.data)
        # Strict user_id check
        self.data = [d for d in self.data if not (d['id'] == doc_id and d['user_id'] == user_id)]
        if len(self.data) < initial_len:
            self.save()

    def search(self, query_vec, user_id, n_results=5):
        if not self.data:
            return []
        
        # Filter data by user_id
        user_data = [d for d in self.data if d.get('user_id') == user_id]
        if not user_data:
            return []
            
        # Convert filtered embeddings to a numpy matrix
        embeddings = np.array([d['embedding'] for d in user_data])
        query_vec = np.array(query_vec)
        
        norm_data = np.linalg.norm(embeddings, axis=1)
        norm_query = np.linalg.norm(query_vec)
        
        denominators = norm_data * norm_query
        similarities = np.dot(embeddings, query_vec) / (denominators + 1e-9)
        
        # Get top N indices
        # If fewer items than n_results, take all
        k = min(n_results, len(user_data))
        top_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for i, idx in enumerate(top_indices):
            res = user_data[idx]
            score = float(similarities[idx])
            # Only print debug info for high matches
            if score > 0.3:
                print(f"Debug: Match found. Title: {res.get('title')}, Score: {score:.4f}")
            results.append({
                "id": res["id"],
                "text": res["text"],
                "metadata": {"title": res["title"]},
                "score": score
            })
        return results

# Singleton instance
store = LocalVectorStore(VECTOR_DB_FILE)

def get_embedding(text: str):
    return model.encode(text).tolist()

def upsert_document(doc_id: str, user_id: str, title: str, text: str):
    combined_text = f"{title}: {text}"
    embedding = get_embedding(combined_text)
    store.upsert(doc_id, user_id, title, text, embedding)
    print(f"Upserted document {doc_id} for user {user_id}")

def delete_document(doc_id: str, user_id: str):
    store.delete(doc_id, user_id)
    print(f"Deleted document {doc_id}")

def search_documents(query: str, user_id: str, n_results: int = 5):
    if not store.data:
        store.load()

    query_vec = get_embedding(query)
    return store.search(query_vec, user_id, n_results)