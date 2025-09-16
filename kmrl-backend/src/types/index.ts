// Core Type Definitions for KMRL Document Management System

export interface User {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  department: 'METRO_ENGINEERING' | 'TRACK_SYSTEMS' | 'ELECTRICAL' | 'ROLLING_STOCK' | 'CIVIL' | 'SAFETY' | 'ADMINISTRATION' | 'PLANNING' | 'FINANCE' | 'HR' | 'LEGAL' | 'MAINTENANCE' | 'OPERATIONS' | 'PROCUREMENT' | 'IT' | 'SECURITY' | 'QUALITY_ASSURANCE';
  role: 'admin' | 'manager' | 'engineer' | 'analyst' | 'director' | 'station_controller' | 'finance_officer' | 'safety_officer' | 'hr_officer' | 'legal_advisor';
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  department: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_by: number;
  start_date?: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  file_hash: string;
  project_id?: number;
  department: string;
  uploaded_by: number;
  urgency_level: 'routine' | 'priority' | 'urgent' | 'critical';
  document_type?: 'engineering_drawing' | 'maintenance_report' | 'vendor_bill' | 'purchase_order' | 'safety_notice' | 'hr_policy' | 'legal_opinion' | 'board_minutes' | 'compliance_document' | 'training_material' | 'operational_manual' | 'financial_report' | 'audit_report' | 'correspondence' | 'technical_specification' | 'other';
  language?: 'english' | 'malayalam' | 'mixed';
  ai_summary?: string;
  ai_keywords?: string[];
  key_points?: string[];
  compliance_flags?: string[];
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  processed_at?: Date;
}

export interface DocumentClassification {
  id: number;
  document_id: number;
  classification_type: 'engineering_drawing' | 'maintenance_report' | 'vendor_bill' | 'purchase_order' | 'safety_notice' | 'hr_policy' | 'legal_opinion' | 'board_minutes' | 'compliance_document' | 'training_material' | 'operational_manual' | 'financial_report' | 'audit_report' | 'correspondence' | 'technical_specification' | 'other';
  confidence_score: number;
  department_relevance: string[];
  priority_level: 'low' | 'medium' | 'high' | 'critical';
  compliance_required: boolean;
  ai_generated: boolean;
  verified_by?: number;
  created_at: Date;
}

export interface Session {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface DashboardMetrics {
  documentsProcessedToday: number;
  totalDocuments: number;
  departmentBreakdown: Record<string, number>;
  urgentDocuments: number;
  avgProcessingTime: number;
  activeProjects: number;
  systemUptime: number;
  storageUsed: number;
}

export interface AIProcessingResult {
  document_type: string;
  confidence: number;
  processing_time: number;
  summary?: string;
  keywords?: string[];
  key_points?: string[];
  language?: 'english' | 'malayalam' | 'mixed';
  compliance_flags?: string[];
  department_relevance?: string[];
  entities?: {
    dates: string[];
    amounts: string[];
    project_codes: string[];
    departments: string[];
    personnel: string[];
  };
}

export interface SearchQuery {
  query: string;
  filters?: {
    document_type?: string;
    project_id?: number;
    department?: string;
    urgency_level?: string;
    date_range?: {
      start: Date;
      end: Date;
    };
  };
  sort?: 'relevance' | 'date' | 'urgency';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  processing_time: number;
}

export interface FileUploadRequest {
  files: Express.Multer.File[];
  project_id?: number;
  department: string;
  urgency_level: 'routine' | 'priority' | 'urgent' | 'critical';
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  token: string;
  expires_in: string;
}

// Express Request Extensions
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}