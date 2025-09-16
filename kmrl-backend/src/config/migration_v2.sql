-- KMRL Database Migration V2: External API Integration
-- Run this migration to update existing database for external API integration

BEGIN;

-- Add new columns for external AI processing
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS ai_classification VARCHAR(100),
ADD COLUMN IF NOT EXISTS classification_confidence DECIMAL(5,4) CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
ADD COLUMN IF NOT EXISTS summary_confidence DECIMAL(5,4) CHECK (summary_confidence >= 0 AND summary_confidence <= 1),
ADD COLUMN IF NOT EXISTS ai_keywords TEXT[],
ADD COLUMN IF NOT EXISTS extracted_entities JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS classification_api_response JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS summary_api_response JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP;

-- Update processing_status column if it doesn't exist or has wrong constraints
DO $$
BEGIN
    -- Check if processing_status column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'processing_status'
    ) THEN
        ALTER TABLE documents ADD COLUMN processing_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
    END IF;
END $$;

-- Remove old status column if it exists (conflicted with processing_status)
ALTER TABLE documents DROP COLUMN IF EXISTS status;

-- Update document_type column to use new KMRL classification types
ALTER TABLE documents ALTER COLUMN document_type TYPE VARCHAR(50);

-- Create new indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_ai_classification ON documents(ai_classification);
CREATE INDEX IF NOT EXISTS idx_documents_classification_confidence ON documents(classification_confidence);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_documents_processing_completed_at ON documents(processing_completed_at);

-- Update document_classifications table with new KMRL types
DELETE FROM document_classifications; -- Clear old data

INSERT INTO document_classifications (name, description, department, urgency_level) VALUES
('maintenance&operation', 'Equipment maintenance, operational procedures, technical drawings', 'Engineering', 'high'),
('finance&procurement', 'Bills, invoices, purchase orders, budgets, financial reports', 'Finance', 'normal'),
('compliance&regulatory', 'Regulatory documents, compliance standards, audit reports', 'Legal', 'urgent'),
('safety&training', 'Safety protocols, training materials, emergency procedures', 'Safety', 'urgent'),
('humanresources', 'HR policies, employee guidelines, personnel management', 'HR', 'normal'),
('legal&governance', 'Contracts, legal opinions, board minutes, governance documents', 'Legal', 'high'),
('general communication', 'General correspondence, memos, notices', 'Administration', 'low')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    department = EXCLUDED.department,
    urgency_level = EXCLUDED.urgency_level;

-- Update any existing documents to use new classification types (basic mapping)
UPDATE documents SET 
    document_type = CASE 
        WHEN document_type IN ('engineering_drawing', 'maintenance_report', 'operational_manual', 'technical_specification') THEN 'maintenance&operation'
        WHEN document_type IN ('vendor_bill', 'purchase_order', 'financial_report', 'audit_report') THEN 'finance&procurement'
        WHEN document_type IN ('compliance_document') THEN 'compliance&regulatory'
        WHEN document_type IN ('safety_notice', 'training_material') THEN 'safety&training'
        WHEN document_type IN ('hr_policy') THEN 'humanresources'
        WHEN document_type IN ('legal_opinion', 'board_minutes') THEN 'legal&governance'
        WHEN document_type IN ('correspondence', 'other') THEN 'general communication'
        ELSE 'general communication'
    END
WHERE document_type IS NOT NULL;

-- Update confidence_score column name if it exists (rename to classification_confidence)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'confidence_score'
    ) THEN
        ALTER TABLE documents RENAME COLUMN confidence_score TO classification_confidence;
    END IF;
END $$;

COMMIT;

-- Verify migration
SELECT 'Migration completed successfully. New columns added:' as message;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'documents' 
  AND column_name IN ('ai_classification', 'classification_confidence', 'summary_confidence', 'processing_status', 'classification_api_response', 'summary_api_response')
ORDER BY column_name;

SELECT 'Updated classification types:' as message;
SELECT name, description FROM document_classifications ORDER BY name;