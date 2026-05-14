# ScholarSight ✨

AI-Powered Academic & Admissions Consultant for Vietnamese students.

**"Single Source of Truth"** — verified, personalized, and up-to-date admissions guidance built on RAG architecture.

## 🎯 Overview

ScholarSight helps Vietnamese students navigate the complex university admissions process using:

- **RAG-Powered Q&A** — No hallucinations. Every answer is grounded in official university handbooks with source citations.
- **Probability Engine** — Tiered assessment (🟢 Safety / 🟡 Target / 🔴 Reach) based on historical MoET score distributions.
- **Interactive Roadmap** — Kanban to-do list with personalized monthly milestones for admissions prep.

## 🏗️ Architecture

```
User → Next.js Frontend → FastAPI Gateway → RAG Pipeline (pgvector + LLM)
                                            ├── Probability Engine (percentile matching)
                                            └── Roadmap Service (Kanban CRUD)

PDF → OCR Chain (DeepSeek→Mistral→PageIndex) → Summarization → BGE-M3 → pgvector
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for frontend dev)
- Python 3.11+ (for backend dev)

### 1. Clone & Setup

```bash
git clone <repo-url> scholarsight
cd scholarsight

# Copy environment file
cp .env.example .env
# Edit .env with your OpenAI API key
```

### 2. Start Infrastructure

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis minio
```

### 3. Start Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8081
```

### 4. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📂 Project Structure

```
Scholarsight/
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/routes/   # REST endpoints
│   │   ├── core/         # Config, security, logging
│   │   ├── db/           # Session, migrations
│   │   ├── services/     # OCR, LLM, embedding, retrieval, probability
│   │   └── tasks/        # Celery async tasks
│   └── tests/
├── frontend/             # Next.js + TailwindCSS + shadcn/ui
├── docker/               # Docker Compose & Nginx configs
├── scripts/              # Init DB, deploy, seed data
└── plans/                # Architecture & task breakdown docs
```

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Next.js + TailwindCSS + shadcn/ui |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL + pgvector |
| Cache/Broker | Redis |
| Embeddings | BGE-M3 (self-hosted via TEI) |
| LLM | OpenAI GPT-4o / GPT-4o-mini |
| OCR | DeepSeek OCR → Mistral OCR → PageIndex (fallback chain) |
| Task Queue | Celery + Redis |
| Object Storage | MinIO (S3-compatible) |