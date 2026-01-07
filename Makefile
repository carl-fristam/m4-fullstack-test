.PHONY: help up down logs build rebuild clean install dev frontend backend test lint format shell-frontend shell-backend db-shell stop restart ps pull push

# Default target
help:
	@echo "M4 Fullstack - Development Commands"
	@echo ""
	@echo "Docker Commands:"
	@echo "  make up              - Start all services (docker-compose up --build -d)"
	@echo "  make down            - Stop all services"
	@echo "  make logs            - View logs from all services"
	@echo "  make logs-backend    - View backend logs only"
	@echo "  make logs-frontend   - View frontend logs only"
	@echo "  make logs-mongo      - View MongoDB logs only"
	@echo "  make build           - Build Docker images without starting"
	@echo "  make rebuild         - Rebuild Docker images from scratch"
	@echo "  make ps              - Show running containers"
	@echo "  make restart         - Restart all services"
	@echo "  make stop            - Stop all services (alias for down)"
	@echo ""
	@echo "Development Commands:"
	@echo "  make install-frontend - Install frontend dependencies"
	@echo "  make install-backend  - Install backend dependencies"
	@echo "  make install          - Install all dependencies"
	@echo "  make frontend-dev     - Run frontend dev server locally (npm run dev)"
	@echo "  make backend-dev      - Run backend dev server locally (uvicorn)"
	@echo "  make lint             - Lint frontend code"
	@echo "  make format           - Format frontend code (if configured)"
	@echo ""
	@echo "Interactive Commands:"
	@echo "  make shell-frontend   - Open shell in frontend container"
	@echo "  make shell-backend    - Open shell in backend container"
	@echo "  make db-shell         - Open MongoDB shell"
	@echo ""
	@echo "Build & Production:"
	@echo "  make frontend-build   - Build frontend for production"
	@echo "  make backend-test     - Run backend tests (if available)"
	@echo "  make clean            - Remove containers, volumes, and node_modules"
	@echo "  make clean-volumes    - Remove only Docker volumes"
	@echo "  make clean-images     - Remove Docker images"
	@echo ""

# Docker-based commands
up:
	docker-compose up --build -d

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-mongo:
	docker-compose logs -f mongo

build:
	docker-compose build

rebuild:
	docker-compose down
	docker image prune -f
	docker-compose build --no-cache

ps:
	docker-compose ps

restart:
	docker-compose restart

stop: down

# Local development commands (without Docker)
install: install-frontend install-backend
	@echo "All dependencies installed!"

install-frontend:
	cd frontend && npm install

install-backend:
	cd backend && python3 -m venv venv
	cd backend && . venv/bin/activate && pip install -r requirements.txt

frontend-dev:
	cd frontend && npm run dev

backend-dev:
	cd backend && . venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend-build:
	cd frontend && npm run build

lint:
	cd frontend && npm run lint

format:
	cd frontend && npm run lint -- --fix

# Interactive shell access
shell-frontend:
	docker-compose exec frontend sh

shell-backend:
	docker-compose exec backend bash

db-shell:
	docker-compose exec mongo mongosh

# Testing
backend-test:
	cd backend && . venv/bin/activate && pytest

# Cleanup commands
clean: down
	rm -rf frontend/node_modules
	rm -rf frontend/dist
	rm -rf backend/venv
	rm -rf backend/__pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	docker volume prune -f
	@echo "Cleanup complete!"

clean-volumes:
	docker volume prune -f
	@echo "Volumes cleaned!"

clean-images:
	docker image prune -f
	@echo "Images cleaned!"

# Status and info
status: ps
	@echo ""
	@echo "Services status above. Access points:"
	@echo "  Frontend:     http://localhost:5173"
	@echo "  Backend API:  http://localhost:8000"
	@echo "  API Docs:     http://localhost:8000/docs"
	@echo "  Mongo Express: http://localhost:8081"
