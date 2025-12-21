# Small test project (fullstack)

## Project Structure

```text
.
├── backend/            # FastAPI (Containerized)
│   ├── main.py         # Routes and Pydantic models
│   ├── db_config.py    # Mongo connection logic
│   ├── auth.py         # JWT and Bcrypt logic
│   └── Dockerfile
├── frontend/           # React + Vite (Containerized)
│   ├── src/
│   │   ├── components/
│   │   │   └── Login.jsx
│   │   └── App.jsx
│   └── Dockerfile      # Multi-stage build for React
├── docker-compose.yml  # Orchestrates all services
└── requirements.txt    # Python Dependencies

```

---

## Technical Stack

* **Frontend:** React, Tailwind CSS
* **Backend:** FastAPI (Python)
* **Database:** MongoDB
* **Management:** Docker & Docker Compose

---

## Launch Instructions

### 1. Initialize Stack

This command builds the images for both the React frontend and FastAPI backend, then starts the MongoDB instance.

```bash
docker-compose up --build

```

### 2. Networking Logic

Because all services are in Docker, they communicate using the service names defined in `docker-compose.yml`:

* **React to FastAPI:** Uses `http://backend:8000` (internal) or `http://localhost:8000` (from browser).
* **FastAPI to Mongo:** Uses `mongodb://mongo:27017`.

---

## Access Points

* **Production UI:** [http://localhost:5173](https://www.google.com/search?q=http://localhost:5173)
* **API Root:** [http://localhost:8000](https://www.google.com/search?q=http://localhost:8000)
* **API Docs (Swagger):** [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)
* **Database UI:** [http://localhost:8081](https://www.google.com/search?q=http://localhost:8081)

---

## API Documentation

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/` | No | Heartbeat Check |
| `POST` | `/register` | No | Register User |
| `POST` | `/login` | No | Get JWT Token |
| `GET` | `/tasks` | **JWT** | Fetch All Tasks |
| `POST` | `/tasks` | **JWT** | Create Task |
| `DELETE` | `/tasks/{id}` | **JWT** | Delete Task |

---

## System Commands

**Monitor All Traffic:** View live logs from the frontend, backend, and database simultaneously:

```bash
docker-compose logs -f

```

**Access Backend Shell:** If you need to run migrations or manual scripts inside the container:

```bash
docker-compose exec backend bash

```

**Database Cleanup:** Stop the stack and wipe all stored users and tasks:

```bash
docker-compose down -v

```

**Rebuild Specific Service:** If you only changed the React code or the FastAPI models:

```bash
docker-compose up --build frontend
# or
docker-compose up --build backend

```