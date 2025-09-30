-- PMWiki Database Schema
-- PostgreSQL + pgvector for citation-focused RAG system
-- Created for academic project comparing PMBOK, PRINCE2, and ISO 21502

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create custom types
CREATE TYPE standard_type AS ENUM ('PMBOK', 'PRINCE2', 'ISO_21502');
CREATE TYPE citation_format AS ENUM ('APA', 'MLA', 'IEEE', 'CHICAGO');
CREATE TYPE content_type AS ENUM ('TEXT', 'TABLE', 'FIGURE', 'LIST', 'DEFINITION');
CREATE TYPE relationship_type AS ENUM ('SIMILAR', 'EQUIVALENT', 'RELATED', 'CONTRASTS', 'BUILDS_ON');

-- Core table for document sections (chunks)
CREATE TABLE document_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standard standard_type NOT NULL,
    section_number VARCHAR(20) NOT NULL,
    section_title TEXT NOT NULL,
    level INTEGER NOT NULL CHECK (level >= 0 AND level <= 5),
    page_start INTEGER,
    page_end INTEGER,

    -- Content fields
    content TEXT NOT NULL,
    content_cleaned TEXT NOT NULL,
    content_original TEXT NOT NULL,
    word_count INTEGER GENERATED ALWAYS AS (array_length(string_to_array(trim(content_cleaned), ' '), 1)) STORED,

    -- Hierarchical relationships
    parent_section_id UUID REFERENCES document_sections(id),
    parent_chain JSONB NOT NULL DEFAULT '[]',
    child_count INTEGER DEFAULT 0,

    -- Content metadata
    content_flags JSONB DEFAULT '{}',
    has_figures BOOLEAN GENERATED ALWAYS AS (content_flags ->> 'has_figures' = 'true') STORED,
    has_tables BOOLEAN GENERATED ALWAYS AS (content_flags ->> 'has_tables' = 'true') STORED,
    has_bullet_points BOOLEAN GENERATED ALWAYS AS (content_flags ->> 'has_bullet_points' = 'true') STORED,

    -- Embedding and search
    embedding vector(1024), -- Voyage-3-large embeddings
    embedding_model VARCHAR(50) DEFAULT 'voyage-3-large',
    embedding_created_at TIMESTAMP,

    -- Citation metadata
    citation_key VARCHAR(100) UNIQUE NOT NULL,

    -- Audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_page_range CHECK (page_end IS NULL OR page_end >= page_start),
    CONSTRAINT valid_citation_key CHECK (citation_key ~ '^[A-Z0-9_]+_\d+(\.\d+)*$')
);

-- Table for tracking cross-standard relationships
CREATE TABLE section_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_section_id UUID NOT NULL REFERENCES document_sections(id) ON DELETE CASCADE,
    target_section_id UUID NOT NULL REFERENCES document_sections(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    similarity_score DECIMAL(5,4) CHECK (similarity_score >= 0 AND similarity_score <= 1),
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    evidence TEXT,

    -- Analysis metadata
    analysis_method VARCHAR(50), -- 'semantic_similarity', 'manual_mapping', 'keyword_analysis'
    created_by VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT NOW(),
    validated_at TIMESTAMP,

    -- Prevent duplicate relationships
    UNIQUE(source_section_id, target_section_id, relationship_type)
);

-- Table for topic/theme mappings
CREATE TABLE topic_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_name VARCHAR(200) NOT NULL,
    topic_slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,

    -- Topic metadata
    keywords TEXT[],
    related_topics TEXT[],

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Many-to-many relationship between sections and topics
CREATE TABLE section_topics (
    section_id UUID NOT NULL REFERENCES document_sections(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topic_mappings(id) ON DELETE CASCADE,
    relevance_score DECIMAL(5,4) CHECK (relevance_score >= 0 AND relevance_score <= 1),

    -- Analysis metadata
    assigned_by VARCHAR(50) DEFAULT 'system',
    assigned_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (section_id, topic_id)
);

-- Table for storing search queries and analytics
CREATE TABLE search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_text TEXT NOT NULL,
    query_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash for deduplication

    -- Search parameters
    search_type VARCHAR(50), -- 'semantic', 'keyword', 'hybrid', 'citation'
    filters JSONB DEFAULT '{}',
    standards_searched standard_type[],

    -- Results metadata
    result_count INTEGER,
    response_time_ms INTEGER,

    -- Usage analytics
    executed_count INTEGER DEFAULT 1,
    first_executed_at TIMESTAMP DEFAULT NOW(),
    last_executed_at TIMESTAMP DEFAULT NOW(),

    -- User context (anonymous for academic use)
    session_id VARCHAR(100),
    user_agent TEXT
);

-- Table for search results and relevance tracking
CREATE TABLE search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    query_id UUID NOT NULL REFERENCES search_queries(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES document_sections(id) ON DELETE CASCADE,

    -- Relevance metrics
    rank_position INTEGER NOT NULL,
    relevance_score DECIMAL(7,6) CHECK (relevance_score >= 0 AND relevance_score <= 1),
    similarity_score DECIMAL(7,6) CHECK (similarity_score >= 0 AND similarity_score <= 1),

    -- User feedback (for academic analysis)
    user_clicked BOOLEAN DEFAULT FALSE,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    feedback_text TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for citation generation and tracking
CREATE TABLE citations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES document_sections(id) ON DELETE CASCADE,
    citation_format citation_format NOT NULL,

    -- Generated citation text
    citation_text TEXT NOT NULL,
    short_citation TEXT,
    in_text_citation TEXT,

    -- Citation metadata
    generated_at TIMESTAMP DEFAULT NOW(),
    template_version VARCHAR(20) DEFAULT '1.0',

    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP,

    UNIQUE(section_id, citation_format)
);

-- Table for RAG conversations and responses
CREATE TABLE rag_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,

    -- Query information
    user_query TEXT NOT NULL,
    query_intent VARCHAR(100), -- 'comparison', 'definition', 'process_generation', 'citation'

    -- Response information
    response_text TEXT NOT NULL,
    response_type VARCHAR(50), -- 'side_by_side', 'comparison', 'process', 'citation_query'

    -- Source tracking
    source_sections UUID[] NOT NULL, -- Array of section IDs used
    citation_count INTEGER DEFAULT 0,

    -- LLM metadata
    llm_model VARCHAR(50) DEFAULT 'llama-3.3-70b-versatile',
    prompt_template VARCHAR(100),
    response_time_ms INTEGER,
    token_count INTEGER,

    -- Quality metrics
    confidence_score DECIMAL(5,4),
    user_feedback_rating INTEGER CHECK (user_feedback_rating >= 1 AND user_feedback_rating <= 5),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Table for process generation templates and results
CREATE TABLE generated_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_name VARCHAR(200) NOT NULL,
    scenario_description TEXT NOT NULL,

    -- Generated process content
    process_steps JSONB NOT NULL, -- Structured process steps
    evidence_sources UUID[] NOT NULL, -- Section IDs providing evidence
    recommendations TEXT,

    -- Generation metadata
    generation_method VARCHAR(50) DEFAULT 'llm_synthesis',
    confidence_score DECIMAL(5,4),

    -- Usage tracking
    conversation_id UUID REFERENCES rag_conversations(id),
    created_at TIMESTAMP DEFAULT NOW(),
    used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP
);

-- Table for system configuration and feature flags
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(100) DEFAULT 'system'
);

-- Table for API usage analytics (for free tier monitoring)
CREATE TABLE api_usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(50) NOT NULL, -- 'voyage_ai', 'groq', 'qdrant'
    endpoint VARCHAR(100),

    -- Usage metrics
    requests_count INTEGER DEFAULT 1,
    tokens_used INTEGER,
    response_time_ms INTEGER,

    -- Rate limiting
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMP,

    -- Cost tracking (for potential upgrades)
    estimated_cost DECIMAL(10,6),

    -- Time tracking
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicates for daily aggregation
    UNIQUE(service_name, endpoint, usage_date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Primary search indexes
CREATE INDEX idx_document_sections_standard ON document_sections(standard);
CREATE INDEX idx_document_sections_section_number ON document_sections(section_number);
CREATE INDEX idx_document_sections_citation_key ON document_sections(citation_key);
CREATE INDEX idx_document_sections_parent ON document_sections(parent_section_id);
CREATE INDEX idx_document_sections_level ON document_sections(level);

-- Full-text search indexes
CREATE INDEX idx_document_sections_content_fts ON document_sections USING gin(to_tsvector('english', content_cleaned));
CREATE INDEX idx_document_sections_title_fts ON document_sections USING gin(to_tsvector('english', section_title));

-- Vector similarity index (for pgvector)
CREATE INDEX idx_document_sections_embedding ON document_sections USING hnsw (embedding vector_cosine_ops);

-- Relationship indexes
CREATE INDEX idx_section_relationships_source ON section_relationships(source_section_id);
CREATE INDEX idx_section_relationships_target ON section_relationships(target_section_id);
CREATE INDEX idx_section_relationships_type ON section_relationships(relationship_type);
CREATE INDEX idx_section_relationships_similarity ON section_relationships(similarity_score DESC);

-- Topic mapping indexes
CREATE INDEX idx_topic_mappings_slug ON topic_mappings(topic_slug);
CREATE INDEX idx_section_topics_relevance ON section_topics(relevance_score DESC);

-- Search analytics indexes
CREATE INDEX idx_search_queries_hash ON search_queries(query_hash);
CREATE INDEX idx_search_queries_executed_at ON search_queries(last_executed_at DESC);
CREATE INDEX idx_search_results_relevance ON search_results(relevance_score DESC);

-- RAG conversation indexes
CREATE INDEX idx_rag_conversations_session ON rag_conversations(session_id);
CREATE INDEX idx_rag_conversations_created ON rag_conversations(created_at DESC);
CREATE INDEX idx_rag_conversations_intent ON rag_conversations(query_intent);

-- API usage indexes
CREATE INDEX idx_api_usage_service_date ON api_usage_tracking(service_name, usage_date);
CREATE INDEX idx_api_usage_created_at ON api_usage_tracking(created_at DESC);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for complete section information with citations
CREATE VIEW v_sections_with_citations AS
SELECT
    s.id,
    s.standard,
    s.section_number,
    s.section_title,
    s.level,
    s.page_start,
    s.page_end,
    s.content_cleaned,
    s.citation_key,
    s.word_count,
    s.has_figures,
    s.has_tables,
    s.has_bullet_points,
    s.parent_chain,
    c.citation_text as apa_citation,
    c.in_text_citation as apa_in_text
FROM document_sections s
LEFT JOIN citations c ON s.id = c.section_id AND c.citation_format = 'APA';

-- View for topic-based section grouping
CREATE VIEW v_topic_sections AS
SELECT
    t.topic_name,
    t.topic_slug,
    s.id as section_id,
    s.standard,
    s.section_number,
    s.section_title,
    st.relevance_score
FROM topic_mappings t
JOIN section_topics st ON t.id = st.topic_id
JOIN document_sections s ON st.section_id = s.id
ORDER BY st.relevance_score DESC;

-- View for cross-standard relationships
CREATE VIEW v_cross_standard_relationships AS
SELECT
    sr.relationship_type,
    sr.similarity_score,
    s1.standard as source_standard,
    s1.section_number as source_section,
    s1.section_title as source_title,
    s2.standard as target_standard,
    s2.section_number as target_section,
    s2.section_title as target_title,
    sr.evidence
FROM section_relationships sr
JOIN document_sections s1 ON sr.source_section_id = s1.id
JOIN document_sections s2 ON sr.target_section_id = s2.id
WHERE s1.standard != s2.standard
ORDER BY sr.similarity_score DESC;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for document_sections
CREATE TRIGGER update_document_sections_updated_at
    BEFORE UPDATE ON document_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for topic_mappings
CREATE TRIGGER update_topic_mappings_updated_at
    BEFORE UPDATE ON topic_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate citation keys
CREATE OR REPLACE FUNCTION generate_citation_key(standard_name standard_type, section_num VARCHAR(20))
RETURNS VARCHAR(100) AS $$
BEGIN
    RETURN UPPER(standard_name::TEXT) || '_' || REPLACE(section_num, '.', '_');
END;
$$ LANGUAGE plpgsql;

-- Function to update child count when hierarchy changes
CREATE OR REPLACE FUNCTION update_child_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update old parent's child count
    IF OLD.parent_section_id IS NOT NULL THEN
        UPDATE document_sections
        SET child_count = (
            SELECT COUNT(*)
            FROM document_sections
            WHERE parent_section_id = OLD.parent_section_id
        )
        WHERE id = OLD.parent_section_id;
    END IF;

    -- Update new parent's child count
    IF NEW.parent_section_id IS NOT NULL THEN
        UPDATE document_sections
        SET child_count = (
            SELECT COUNT(*)
            FROM document_sections
            WHERE parent_section_id = NEW.parent_section_id
        )
        WHERE id = NEW.parent_section_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for maintaining child counts
CREATE TRIGGER maintain_child_counts
    AFTER INSERT OR UPDATE OR DELETE ON document_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_child_count();

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default system configuration
INSERT INTO system_config (key, value, description) VALUES
('embedding_model', '"voyage-3-large"', 'Current embedding model in use'),
('llm_model', '"llama-3.3-70b-versatile"', 'Current LLM model for generation'),
('max_tokens_per_query', '4000', 'Maximum tokens allowed per RAG query'),
('citation_templates_version', '"1.0"', 'Version of citation templates'),
('api_rate_limits', '{"voyage_ai": {"requests_per_minute": 100}, "groq": {"requests_per_day": 1000}}', 'API rate limits configuration');

-- Insert common topics for the three standards
INSERT INTO topic_mappings (topic_name, topic_slug, description, keywords) VALUES
('Risk Management', 'risk-management', 'Identification, assessment, and management of project risks', ARRAY['risk', 'uncertainty', 'mitigation', 'assessment']),
('Stakeholder Engagement', 'stakeholder-engagement', 'Managing relationships with project stakeholders', ARRAY['stakeholder', 'communication', 'engagement', 'management']),
('Quality Management', 'quality-management', 'Ensuring project deliverables meet quality requirements', ARRAY['quality', 'assurance', 'control', 'standards']),
('Scope Management', 'scope-management', 'Defining and controlling project scope', ARRAY['scope', 'requirements', 'deliverables', 'boundaries']),
('Time Management', 'time-management', 'Planning and controlling project schedules', ARRAY['schedule', 'timeline', 'duration', 'planning']),
('Cost Management', 'cost-management', 'Planning and controlling project costs', ARRAY['budget', 'cost', 'financial', 'estimation']),
('Resource Management', 'resource-management', 'Managing human and material resources', ARRAY['resources', 'team', 'allocation', 'capacity']),
('Communication Management', 'communication-management', 'Planning and managing project communications', ARRAY['communication', 'information', 'reporting', 'documentation']),
('Procurement Management', 'procurement-management', 'Managing external suppliers and contracts', ARRAY['procurement', 'suppliers', 'contracts', 'vendors']),
('Integration Management', 'integration-management', 'Coordinating all project management processes', ARRAY['integration', 'coordination', 'processes', 'management']);

-- Create default admin user for system operations
INSERT INTO system_config (key, value, description) VALUES
('system_version', '"1.0.0"', 'Current system version'),
('database_schema_version', '"1.0.0"', 'Current database schema version'),
('last_maintenance', 'null', 'Last maintenance timestamp');

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE document_sections IS 'Core table storing all document sections with embeddings and citation metadata';
COMMENT ON TABLE section_relationships IS 'Stores relationships between sections across different standards';
COMMENT ON TABLE topic_mappings IS 'Predefined topics for organizing and comparing sections';
COMMENT ON TABLE search_queries IS 'Analytics table for tracking search patterns and performance';
COMMENT ON TABLE rag_conversations IS 'Stores RAG conversations for quality analysis and improvement';
COMMENT ON TABLE citations IS 'Generated citations in various academic formats';
COMMENT ON TABLE api_usage_tracking IS 'Monitors API usage to stay within free tier limits';

COMMENT ON COLUMN document_sections.embedding IS 'Vector embedding from Voyage-3-large (1024 dimensions)';
COMMENT ON COLUMN document_sections.citation_key IS 'Unique key for academic citations (e.g., PMBOK_2_1_3)';
COMMENT ON COLUMN document_sections.content_cleaned IS 'Processed content optimized for embeddings';
COMMENT ON COLUMN document_sections.content_original IS 'Original content preserved for accurate citations';

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Query to check embedding coverage
-- SELECT standard, COUNT(*) as total_sections, COUNT(embedding) as sections_with_embeddings
-- FROM document_sections GROUP BY standard;

-- Query to analyze search patterns
-- SELECT query_text, executed_count, AVG(response_time_ms) as avg_response_time
-- FROM search_queries ORDER BY executed_count DESC LIMIT 10;

-- Query to monitor API usage
-- SELECT service_name, SUM(requests_count) as total_requests, SUM(tokens_used) as total_tokens
-- FROM api_usage_tracking WHERE usage_date >= CURRENT_DATE - INTERVAL '7 days' GROUP BY service_name;