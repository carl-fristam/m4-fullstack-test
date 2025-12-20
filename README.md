## Project Structure

```text
.
├── backend/            # FastAPI (Running in Docker)
│   ├── main.py
│   ├── db_config.py
│   └── Dockerfile
├── frontend/           # React + Vite (Running locally)
│   ├── src/
│   ├── index.html
│   └── package.json
├── docker-compose.yml  # Manages Backend & MongoDB
└── requirements.txt    # Python Dependencies

```

---

## Technical Stack

* **Frontend:** React, Tailwind CSS
* **Backend:** FastAPI
* **Database:** MongoDB (Containerized)

---

## Launch Instructions

### 1. Start Database and API

The backend and MongoDB must run inside Docker to communicate correctly.

```bash
docker-compose up --build

```

### 2. Start Frontend

Run the React development server from your local machine.

```bash
cd frontend
npm install
npm run dev

```

### 3. Access

* **Frontend:** http://localhost:5173
* **Backend API:** http://localhost:8000

---

## API Documentation

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/` | System Heartbeat |
| `GET` | `/tasks` | Retrieve all tasks from MongoDB |
| `POST` | `/tasks` | Create a new task |
| `DELETE` | `/tasks/{task_id}` | Remove a task |

---

## System Commands

**Stop Backend:**
`Ctrl + C` in the Docker terminal, or `docker-compose down`.

**Wipe Database:**

```bash
docker-compose down -v

```

**Update Backend Dependencies:**
If you change `requirements.txt`, you must rebuild:

```bash
docker-compose up --build

```