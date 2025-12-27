import numpy as np
import pickle
import os
from sentence_transformers import SentenceTransformer

# --- CONFIGURATION ---
VECTOR_DB_FILE = "vectors.pkl"
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
            with open(self.filename, 'rb') as f:
                self.data = pickle.load(f)
            print(f"Loaded {len(self.data)} documents from {self.filename}")

    def save(self):
        with open(self.filename, 'wb') as f:
            pickle.dump(self.data, f)

    def upsert(self, doc_id, user_id, title, text, embedding):
        # Remove if exists
        self.data = [d for d in self.data if d['id'] != doc_id]
        self.data.append({
            "id": doc_id,
            "user_id": user_id,
            "title": title,
            "text": text,
            "embedding": embedding
        })
        self.save()

    def delete(self, doc_id):
        initial_len = len(self.data)
        self.data = [d for d in self.data if d['id'] != doc_id]
        if len(self.data) < initial_len:
            self.save()

    def search(self, query_vec, user_id, n_results=5):
        if not self.data:
            return []
        
        # Filter data by user_id (or no user_id for legacy docs)
        user_data = [d for d in self.data if d.get('user_id') == user_id or d.get('user_id') is None]
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
        top_indices = np.argsort(similarities)[::-1][:n_results]
        
        results = []
        for i, idx in enumerate(top_indices):
            res = user_data[idx]
            score = float(similarities[idx])
            print(f"Debug: Match found for user {user_id}. Title: {res.get('title')}, Score: {score}")
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

def delete_document(doc_id: str):
    store.delete(doc_id)
    print(f"Deleted document {doc_id}")

def search_documents(query: str, user_id: str, n_results: int = 5):
    if not store.data:
        store.load()

    query_vec = get_embedding(query)
    return store.search(query_vec, user_id, n_results)