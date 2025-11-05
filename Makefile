env:
	@echo "Creating virtual environment"
	@conda create -n myenv python=3.11 -y

install-backend:
	@echo "Install Python Dependencies"
	@pip install -r backend/requirements.txt

install-frontend:
	@echo "Install Frontend Dependencies"
	@cd frontend && npm install

run-backend:
	@echo "Run Backend Server"
	@cd backend && uvicorn main:app --port 8000 --reload

run-frontend:
	@echo "Run Frontend Server"
	@cd frontend && npm run dev

install: install-backend install-frontend

.PHONY: env install-backend install-frontend run-backend run-frontend dev install