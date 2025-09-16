import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';
import { AIProcessingResult } from '../types';
import path from 'path';
import fs from 'fs';

export class AIService {
  private static instance: AIService;
  private mlServiceURL: string;

  private constructor() {
    this.mlServiceURL = process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8000';
  }

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Process document through Python ML service
   */
  static async processDocument(filePath: string): Promise<{ 
    text: string; 
    confidence: number;
    metadata: Record<string, any> 
  }> {
    try {
      logger.info(`Starting document processing for file: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Document file not found: ${filePath}`);
      }

      const aiService = AIService.getInstance();
      
      // Read file and prepare for ML service
      const fileBuffer = fs.readFileSync(filePath);
      const formData = new FormData();
      const extension = path.extname(filePath).toLowerCase();
      
      // Determine MIME type based on extension
      const mimeTypes: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.dwg': 'application/acad',
        '.dxf': 'application/dxf'
      };
      
      const mimeType = mimeTypes[extension] || 'application/octet-stream';
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('document', blob, path.basename(filePath));

      // Send to Python ML service for processing
      const response = await axios.post(
        `${aiService.mlServiceURL}/api/process/document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 300000, // 5 minutes timeout for large documents
        }
      );

      if (response.data.success) {
        const extractedText = response.data.text;
        const confidence = response.data.confidence || 0;
        const metadata = response.data.metadata || {};
        
        if (confidence < (config.ai?.ocrConfidenceThreshold || 0.8)) {
          logger.warn(`Processing confidence (${confidence}) below threshold for ${filePath}`);
        }
        
        logger.info(`Document processing completed successfully for ${filePath}`);
        return { text: extractedText, confidence, metadata };
      } else {
        throw new Error(`Document processing failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Document processing failed:', error);
      throw error;
    }
  }

  /**
   * Classify document using Python ML service
   */
  static async classifyDocument(text: string, filePath: string): Promise<AIProcessingResult> {
    try {
      logger.info(`Starting document classification for: ${path.basename(filePath)}`);
      
      const aiService = AIService.getInstance();
      
      const fileExtension = path.extname(filePath).toLowerCase();
      const payload = {
        text: text,
        filename: path.basename(filePath),
        file_type: fileExtension.substring(1) // Remove the dot
      };

      const response = await axios.post(
        `${aiService.mlServiceURL}/api/classify/document`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 1 minute timeout
        }
      );

      if (response.data.success) {
        const result: AIProcessingResult = {
          document_type: response.data.category || response.data.document_type,
          confidence: response.data.confidence,
          processing_time: response.data.processing_time || 0,
          summary: response.data.summary,
          keywords: response.data.keywords,
          entities: response.data.entities || {
            dates: [],
            amounts: [],
            project_codes: []
          }
        };

        logger.info(`PDF classification completed for ${path.basename(filePath)}: ${result.document_type}`);
        return result;
      } else {
        throw new Error(`Classification failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('PDF document classification failed:', error);
      // Return fallback classification
      return this.fallbackClassification(text, filePath);
    }
  }

  /**
   * Enhanced fallback classification for KMRL document types
   */
  private static fallbackClassification(text: string, filePath: string, department?: string): AIProcessingResult {
    const startTime = Date.now();
    const filename = path.basename(filePath).toLowerCase();
    const extension = path.extname(filePath).substring(1).toLowerCase();
    const content = text.toLowerCase();
    
    let documentType = 'other';
    let confidence = 0.6; // Higher confidence for enhanced rules
    let keyPoints: string[] = [];
    let complianceFlags: string[] = [];
    let departmentRelevance: string[] = [];
    let detectedLanguage: 'english' | 'malayalam' | 'mixed' = 'english';
    
    // Enhanced KMRL-specific classification rules
    
    // Engineering and Technical Documents
    if (filename.includes('drawing') || filename.includes('blueprint') || ['dwg', 'dxf'].includes(extension)) {
      documentType = 'engineering_drawing';
      confidence = 0.9;
      keyPoints = ['Technical drawing', 'Engineering specification', 'Design document'];
      departmentRelevance = ['METRO_ENGINEERING', 'CIVIL', 'ELECTRICAL'];
    }
    else if (filename.includes('spec') || filename.includes('specification') || content.includes('specification')) {
      documentType = 'technical_specification';
      confidence = 0.8;
      keyPoints = ['Technical specification', 'Standards document', 'Requirements'];
      departmentRelevance = ['METRO_ENGINEERING', 'QUALITY_ASSURANCE'];
    }
    
    // Maintenance and Operations
    else if (filename.includes('maintenance') || filename.includes('inspection') || filename.includes('repair')) {
      documentType = 'maintenance_report';
      confidence = 0.8;
      keyPoints = ['Maintenance activity', 'Equipment status', 'Inspection findings'];
      departmentRelevance = ['MAINTENANCE', 'OPERATIONS', 'SAFETY'];
    }
    else if (filename.includes('operation') || filename.includes('schedule') || content.includes('operation')) {
      documentType = 'operational_manual';
      confidence = 0.7;
      keyPoints = ['Operational procedure', 'Service guidelines', 'Process documentation'];
      departmentRelevance = ['OPERATIONS', 'MAINTENANCE'];
    }
    
    // Financial Documents
    else if (filename.includes('bill') || filename.includes('invoice') || content.includes('invoice') || content.includes('payment')) {
      documentType = 'vendor_bill';
      confidence = 0.8;
      keyPoints = ['Financial transaction', 'Vendor payment', 'Invoice details'];
      departmentRelevance = ['FINANCE', 'PROCUREMENT'];
    }
    else if (filename.includes('purchase') || filename.includes('po_') || filename.includes('order') || content.includes('purchase order')) {
      documentType = 'purchase_order';
      confidence = 0.8;
      keyPoints = ['Purchase requisition', 'Procurement order', 'Vendor selection'];
      departmentRelevance = ['PROCUREMENT', 'FINANCE'];
    }
    else if (filename.includes('budget') || filename.includes('financial') || content.includes('budget')) {
      documentType = 'financial_report';
      confidence = 0.7;
      keyPoints = ['Financial analysis', 'Budget allocation', 'Cost report'];
      departmentRelevance = ['FINANCE', 'ADMINISTRATION'];
    }
    else if (filename.includes('audit') || content.includes('audit')) {
      documentType = 'audit_report';
      confidence = 0.8;
      keyPoints = ['Audit findings', 'Compliance review', 'Quality assessment'];
      departmentRelevance = ['QUALITY_ASSURANCE', 'FINANCE', 'ADMINISTRATION'];
      complianceFlags = ['audit', 'compliance'];
    }
    
    // Safety and Compliance
    else if (filename.includes('safety') || filename.includes('hazard') || filename.includes('incident') || content.includes('safety')) {
      documentType = 'safety_notice';
      confidence = 0.9;
      keyPoints = ['Safety protocol', 'Hazard identification', 'Risk assessment'];
      departmentRelevance = ['SAFETY', 'OPERATIONS', 'MAINTENANCE'];
      complianceFlags = ['safety', 'mandatory'];
    }
    else if (filename.includes('compliance') || content.includes('regulation') || content.includes('mandatory')) {
      documentType = 'compliance_document';
      confidence = 0.8;
      keyPoints = ['Regulatory requirement', 'Compliance standard', 'Legal obligation'];
      departmentRelevance = ['LEGAL', 'ADMINISTRATION', 'SAFETY'];
      complianceFlags = ['regulation', 'compliance', 'mandatory'];
    }
    
    // HR and Administrative
    else if (filename.includes('policy') || filename.includes('hr') || filename.includes('employee') || content.includes('policy')) {
      documentType = 'hr_policy';
      confidence = 0.8;
      keyPoints = ['HR policy', 'Employee guidelines', 'Organizational procedure'];
      departmentRelevance = ['HR', 'ADMINISTRATION'];
    }
    else if (filename.includes('training') || content.includes('training') || content.includes('education')) {
      documentType = 'training_material';
      confidence = 0.7;
      keyPoints = ['Training content', 'Educational material', 'Skill development'];
      departmentRelevance = ['HR', 'SAFETY', 'OPERATIONS'];
    }
    
    // Legal Documents
    else if (filename.includes('legal') || filename.includes('contract') || filename.includes('agreement') || content.includes('contract')) {
      documentType = 'legal_opinion';
      confidence = 0.8;
      keyPoints = ['Legal analysis', 'Contract terms', 'Legal compliance'];
      departmentRelevance = ['LEGAL', 'ADMINISTRATION'];
      complianceFlags = ['legal', 'contract'];
    }
    
    // Board and Management
    else if (filename.includes('board') || filename.includes('minutes') || filename.includes('meeting') || content.includes('board')) {
      documentType = 'board_minutes';
      confidence = 0.9;
      keyPoints = ['Board decision', 'Management directive', 'Strategic planning'];
      departmentRelevance = ['ADMINISTRATION', 'FINANCE', 'OPERATIONS'];
    }
    
    // General document types by extension
    else if (['pdf', 'doc', 'docx'].includes(extension)) {
      documentType = 'correspondence';
      confidence = 0.6;
      keyPoints = ['Document communication', 'Information sharing'];
    }
    else if (['jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(extension)) {
      documentType = 'correspondence';
      confidence = 0.5;
      keyPoints = ['Image document', 'Visual information'];
    }
    else if (extension === 'xlsx') {
      documentType = 'financial_report';
      confidence = 0.6;
      keyPoints = ['Data analysis', 'Spreadsheet information'];
      departmentRelevance = ['FINANCE'];
    }

    // Language detection (basic)
    const malayalamPattern = /[\u0D00-\u0D7F]/;
    const englishPattern = /[A-Za-z]/;
    
    if (content) {
      const hasMalayalam = malayalamPattern.test(content);
      const hasEnglish = englishPattern.test(content);
      
      if (hasMalayalam && hasEnglish) {
        detectedLanguage = 'mixed';
      } else if (hasMalayalam) {
        detectedLanguage = 'malayalam';
      }
    }

    // Add department if provided
    if (department && !departmentRelevance.includes(department)) {
      departmentRelevance.unshift(department);
    }

    const processingTime = Date.now() - startTime;
    
    logger.info(`Enhanced fallback classification: ${documentType} (${confidence}) for ${filename}`);
    
    return {
      document_type: documentType,
      confidence,
      processing_time: processingTime,
      summary: `${documentType.replace('_', ' ')} document: ${path.basename(filePath)}`,
      keywords: keyPoints.slice(0, 5),
      key_points: keyPoints,
      language: detectedLanguage,
      compliance_flags: complianceFlags,
      department_relevance: [...new Set(departmentRelevance)],
      entities: {
        dates: [],
        amounts: [],
        project_codes: [],
        departments: departmentRelevance,
        personnel: []
      }
    };
  }

  /**
   * Extract entities from text content
   */
  static extractEntities(text: string): {
    dates: string[];
    amounts: string[];
    project_codes: string[];
  } {
    const entities = {
      dates: [] as string[],
      amounts: [] as string[],
      project_codes: [] as string[]
    };

    // Extract dates (basic patterns)
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /\d{4}-\d{1,2}-\d{1,2}/g,
      /\d{1,2}-\d{1,2}-\d{4}/g
    ];
    
    datePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        entities.dates.push(...matches);
      }
    });

    // Extract amounts (currency patterns)
    const amountPatterns = [
      /\$[\d,]+\.?\d*/g,
      /USD\s*[\d,]+\.?\d*/g,
      /₹[\d,]+\.?\d*/g,
      /INR\s*[\d,]+\.?\d*/g
    ];
    
    amountPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        entities.amounts.push(...matches);
      }
    });

    // Extract project codes (assuming format like PROJ-001, KM-2024-001, etc.)
    const projectCodePatterns = [
      /[A-Z]{2,4}-\d{3,4}/g,
      /[A-Z]{2,4}-\d{4}-\d{3}/g,
      /PROJ-\d+/g,
      /KM-\d+-\d+/g
    ];
    
    projectCodePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        entities.project_codes.push(...matches);
      }
    });

    return entities;
  }

  /**
   * Health check for ML service
   */
  static async healthCheck(): Promise<{
    mlService: boolean;
  }> {
    const health = {
      mlService: false
    };

    // Check Python ML service
    try {
      const aiService = AIService.getInstance();
      const response = await axios.get(`${aiService.mlServiceURL}/health`, {
        timeout: 5000
      });
      health.mlService = response.status === 200;
    } catch (error) {
      logger.warn('Python ML service health check failed');
    }

    return health;
  }
}