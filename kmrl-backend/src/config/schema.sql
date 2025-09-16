-- KMRL Document Management System Database Schema
-- PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (simplified without Firebase)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL, -- KMRL username (e.g., firstname.lastname)
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hashed password
    
    -- KMRL-specific fields
    employee_id VARCHAR(50) UNIQUE, -- KMRL employee ID
    department VARCHAR(50) NOT NULL, -- Engineering, Finance, HR, Safety, Legal, Operations, Management
    role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('director', 'manager', 'senior_officer', 'officer', 'employee')),
    
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table (simplified for KMRL operations)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(50) NOT NULL, -- Which department owns this project
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold')),
    
    project_manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Documents table (with local file storage)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(20) NOT NULL, -- pdf, doc, image, etc.
    file_path VARCHAR(500) NOT NULL, -- Local file system path
    file_hash VARCHAR(64), -- SHA-256 hash for duplicate detection
    
    -- KMRL-specific fields
    department VARCHAR(50), -- Engineering, Finance, HR, Safety, Legal, Operations
    document_type VARCHAR(50), -- report, drawing, invoice, policy, etc.
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('urgent', 'high', 'normal', 'low')),
    
    -- ML processing results
    ai_summary TEXT, -- Key summary from ML model
    ai_classification VARCHAR(100),
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    extracted_entities JSONB DEFAULT '{}', -- Dates, amounts, project codes from ML
    
    -- Basic metadata
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'processed' CHECK (status IN ('processing', 'processed', 'failed')),
    tags TEXT[],
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User sessions table (JWT-based auth)
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL, -- Hashed JWT token for blacklisting
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Document classifications lookup table (KMRL-specific)
CREATE TABLE IF NOT EXISTS document_classifications (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    department VARCHAR(50), -- Engineering, Finance, HR, Safety, Legal, Operations
    urgency_level VARCHAR(20) DEFAULT 'normal' CHECK (urgency_level IN ('urgent', 'high', 'normal', 'low')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Project members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'manager', 'member')),
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Indexes for performance optimization (without Firebase)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

CREATE INDEX IF NOT EXISTS idx_documents_department ON documents(department);
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_urgency_level ON documents(urgency_level);
CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_projects_department ON projects(department);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Full-text search index on AI summary (most important for KMRL)
CREATE INDEX IF NOT EXISTS idx_documents_summary_fts ON documents USING gin(to_tsvector('english', ai_summary));

-- Triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert KMRL-specific document classifications
INSERT INTO document_classifications (name, description, department, urgency_level) VALUES
('Engineering Drawing', 'CAD drawings and technical blueprints', 'Engineering', 'normal'),
('Safety Notice', 'Safety alerts and compliance documents', 'Safety', 'urgent'),
('Maintenance Report', 'Equipment maintenance and inspection reports', 'Engineering', 'high'),
('Financial Invoice', 'Vendor bills and purchase orders', 'Finance', 'normal'),
('HR Policy', 'Human resources policies and procedures', 'HR', 'normal'),
('Legal Opinion', 'Legal advice and compliance documents', 'Legal', 'high'),
('Board Minutes', 'Board meeting minutes and decisions', 'Management', 'high'),
('Permit Document', 'Government permits and licenses', 'Legal', 'urgent'),
('Operations Report', 'Daily operations and performance reports', 'Operations', 'normal'),
('Training Material', 'Employee training and development content', 'HR', 'low')
ON CONFLICT (name) DO NOTHING;