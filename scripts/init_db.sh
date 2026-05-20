#!/bin/bash
set -e

echo "Initializing ScholarSight database..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable pgvector extension
    CREATE EXTENSION IF NOT EXISTS vector;

    -- Vector Store: Summaries with embeddings
    CREATE TABLE IF NOT EXISTS summary_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_id UUID NOT NULL,
        component_type TEXT NOT NULL CHECK (component_type IN ('image', 'table', 'text')),
        summary_text TEXT NOT NULL,
        embedding vector(1024),
        source_page INTEGER,
        university_name TEXT,
        academic_year INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_summary_embeddings_vector
        ON summary_embeddings USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);

    CREATE INDEX IF NOT EXISTS idx_summary_embeddings_doc_id ON summary_embeddings(doc_id);
    CREATE INDEX IF NOT EXISTS idx_summary_embeddings_university ON summary_embeddings(university_name);

    -- Document Store: Original components
    CREATE TABLE IF NOT EXISTS raw_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_id UUID NOT NULL,
        component_type TEXT NOT NULL CHECK (component_type IN ('image', 'table', 'text')),
        raw_content TEXT,
        image_url TEXT,
        table_structure JSONB,
        ocr_source TEXT,
        source_file TEXT NOT NULL,
        source_page INTEGER,
        university_name TEXT,
        academic_year INTEGER,
        ingestion_batch_id UUID,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_raw_components_doc_id ON raw_components(doc_id);
    CREATE INDEX IF NOT EXISTS idx_raw_components_university ON raw_components(university_name);
    CREATE INDEX IF NOT EXISTS idx_raw_components_batch ON raw_components(ingestion_batch_id);

    -- Application tables will be created by Alembic migrations
    -- But we create them here for the initial setup

    -- Users
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT DEFAULT 'student' CHECK (role IN ('student', 'counselor', 'admin')),
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Query history
    CREATE TABLE IF NOT EXISTS query_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        query_text TEXT NOT NULL,
        retrieved_doc_ids UUID[],
        synthesized_answer TEXT,
        source_citations JSONB,
        cosine_scores FLOAT[],
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Probability assessments
    CREATE TABLE IF NOT EXISTS probability_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        university_name TEXT,
        major TEXT,
        candidate_score FLOAT,
        tier TEXT CHECK (tier IN ('safety', 'target', 'reach')),
        percentile_rank FLOAT,
        competitive_map_data JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Historical scores (for probability engine)
    CREATE TABLE IF NOT EXISTS historical_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        university_name TEXT NOT NULL,
        major TEXT NOT NULL,
        academic_year INTEGER NOT NULL,
        admission_method TEXT,
        quota INTEGER,
        cutoff_score FLOAT,
        score_distribution JSONB,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_historical_scores_lookup
        ON historical_scores(university_name, major, academic_year);

    -- Roadmap tasks
    CREATE TABLE IF NOT EXISTS roadmap_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
        due_month INTEGER CHECK (due_month BETWEEN 1 AND 12),
        category TEXT CHECK (category IN ('exam_prep', 'application', 'document', 'financial', 'other')),
        sort_order INTEGER,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_user ON roadmap_tasks(user_id);

    -- Documents (user-uploaded files for the Document Library UI)
    CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('pdf', 'image', 'text')),
        status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
        page_count INTEGER,
        file_size INTEGER NOT NULL DEFAULT 0,
        uploaded_at TIMESTAMPTZ DEFAULT now()
    );

    -- Ingestion batches
    CREATE TABLE IF NOT EXISTS ingestion_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_file TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        total_pages INTEGER,
        processed_pages INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
    );

EOSQL

echo "Database initialization complete!"