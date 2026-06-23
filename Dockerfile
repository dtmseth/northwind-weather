# Northwind Weather — Dockerfile for Fly.io deployment

FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all source code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Run from backend directory so imports resolve
WORKDIR /app/backend

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
