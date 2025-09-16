import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';
import { AIProcessingResult } from '../types';
import path from 'path';
import fs from 'fs';

export class AIService {
  private static instance: AIService;
  private mlServiceURL: string;
  private classificationAPI: string;
  private summaryAPI: string;

  private constructor() {
    this.mlServiceURL = process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8000';
    this.classificationAPI = process.env.ML_CLASSIFICATION_API || 'http://localhost:8000/api/classify';
    this.summaryAPI = process.env.ML_SUMMARY_API || 'http://localhost:8000/api/summarize';
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
   * Classify document using external ML classification API
   */
  static async classifyDocument(text: string, filePath: string): Promise<AIProcessingResult> {
    try {
      logger.info(`Starting document classification for: ${path.basename(filePath)}`);
      
      const aiService = AIService.getInstance();
      
      const fileExtension = path.extname(filePath).toLowerCase();
      const payload = {
        text: text,
        filename: path.basename(filePath),
        file_type: fileExtension.substring(1), // Remove the dot
        content_type: path.extname(filePath).toLowerCase()
      };

      // Call external classification API
      const response = await axios.post(
        aiService.classificationAPI,
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
          document_type: response.data.category || response.data.document_type || response.data.classification,
          confidence: response.data.confidence,
          processing_time: response.data.processing_time || 0,
          summary: response.data.summary || '',
          keywords: response.data.keywords || [],
          entities: response.data.entities || {
            dates: [],
            amounts: [],
            project_codes: []
          }
        };

        logger.info(`Document classification completed for ${path.basename(filePath)}: ${result.document_type} (confidence: ${result.confidence})`);
        return result;
      } else {
        throw new Error(`Classification API failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('External document classification failed:', error);
      // Return fallback classification
      return this.fallbackClassification(text, filePath);
    }
  }

  /**
   * Generate document summary using external ML summary API
   */
  static async generateSummary(text: string, filePath: string, documentType?: string): Promise<{
    summary: string;
    keywords: string[];
    confidence: number;
    processing_time: number;
  }> {
    try {
      logger.info(`Starting document summary generation for: ${path.basename(filePath)}`);
      
      const aiService = AIService.getInstance();
      
      const payload = {
        text: text,
        filename: path.basename(filePath),
        document_type: documentType || 'unknown',
        max_summary_length: 500
      };

      // Call external summary API
      const response = await axios.post(
        aiService.summaryAPI,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 1 minute timeout
        }
      );

      if (response.data.success) {
        const result = {
          summary: response.data.summary,
          keywords: response.data.keywords || [],
          confidence: response.data.confidence || 0.8,
          processing_time: response.data.processing_time || 0
        };

        logger.info(`Document summary generated for ${path.basename(filePath)} (${result.summary.length} chars)`);
        return result;
      } else {
        throw new Error(`Summary API failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('External document summary generation failed:', error);
      // Return fallback summary
      return this.fallbackSummary(text, filePath);
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
    
    // Enhanced KMRL-specific classification rules using official categories
    
    // Maintenance & Operation
    if (filename.includes('maintenance') || filename.includes('inspection') || filename.includes('repair') || 
        filename.includes('operation') || filename.includes('schedule') || content.includes('maintenance') || 
        content.includes('operation') || ['dwg', 'dxf'].includes(extension)) {
      documentType = 'maintenance&operation';
      confidence = 0.85;
      keyPoints = ['Maintenance activity', 'Operational procedure', 'Equipment status', 'Technical drawing'];
      departmentRelevance = ['MAINTENANCE', 'OPERATIONS', 'METRO_ENGINEERING'];
    }
    
    // Finance & Procurement
    else if (filename.includes('bill') || filename.includes('invoice') || filename.includes('purchase') || 
             filename.includes('budget') || filename.includes('financial') || filename.includes('audit') ||
             content.includes('payment') || content.includes('procurement') || content.includes('budget') ||
             extension === 'xlsx') {
      documentType = 'finance&procurement';
      confidence = 0.85;
      keyPoints = ['Financial transaction', 'Purchase order', 'Budget allocation', 'Vendor payment'];
      departmentRelevance = ['FINANCE', 'PROCUREMENT'];
    }
    
    // Compliance & Regulatory
    else if (filename.includes('compliance') || filename.includes('regulation') || filename.includes('standard') ||
             filename.includes('audit') || content.includes('regulation') || content.includes('mandatory') ||
             content.includes('compliance') || content.includes('standard')) {
      documentType = 'compliance&regulatory';
      confidence = 0.90;
      keyPoints = ['Regulatory requirement', 'Compliance standard', 'Legal obligation', 'Audit findings'];
      departmentRelevance = ['LEGAL', 'ADMINISTRATION', 'QUALITY_ASSURANCE'];
      complianceFlags = ['regulation', 'compliance', 'mandatory'];
    }
    
    // Safety & Training
    else if (filename.includes('safety') || filename.includes('training') || filename.includes('hazard') || 
             filename.includes('incident') || filename.includes('emergency') || content.includes('safety') ||
             content.includes('training') || content.includes('emergency')) {
      documentType = 'safety&training';
      confidence = 0.90;
      keyPoints = ['Safety protocol', 'Training material', 'Hazard identification', 'Emergency procedure'];
      departmentRelevance = ['SAFETY', 'HR', 'OPERATIONS'];
      complianceFlags = ['safety', 'mandatory'];
    }
    
    // Human Resources
    else if (filename.includes('hr') || filename.includes('employee') || filename.includes('policy') || 
             filename.includes('staff') || filename.includes('personnel') || content.includes('employee') ||
             content.includes('policy') || content.includes('personnel')) {
      documentType = 'humanresources';
      confidence = 0.85;
      keyPoints = ['HR policy', 'Employee guidelines', 'Personnel management', 'Organizational procedure'];
      departmentRelevance = ['HR', 'ADMINISTRATION'];
    }
    
    // Legal & Governance
    else if (filename.includes('legal') || filename.includes('contract') || filename.includes('agreement') || 
             filename.includes('board') || filename.includes('minutes') || filename.includes('governance') ||
             content.includes('contract') || content.includes('board') || content.includes('legal')) {
      documentType = 'legal&governance';
      confidence = 0.85;
      keyPoints = ['Legal analysis', 'Contract terms', 'Board decision', 'Governance framework'];
      departmentRelevance = ['LEGAL', 'ADMINISTRATION'];
      complianceFlags = ['legal', 'contract'];
    }
    
    // General Communication (default fallback)
    else {
      documentType = 'general communication';
      confidence = 0.60;
      keyPoints = ['Document communication', 'Information sharing', 'General correspondence'];
      departmentRelevance = ['ADMINISTRATION'];
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
   * Fallback summary generation when external API fails
   */
  private static fallbackSummary(text: string, filePath: string): {
    summary: string;
    keywords: string[];
    confidence: number;
    processing_time: number;
  } {
    const startTime = Date.now();
    const filename = path.basename(filePath);
    
    // Generate basic summary from text
    let summary = '';
    let keywords: string[] = [];
    const confidence = 0.6; // Lower confidence for fallback
    
    if (text && text.length > 0) {
      // Extract first few sentences as summary
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      summary = sentences.slice(0, 3).join('. ').trim();
      
      if (summary.length > 500) {
        summary = summary.substring(0, 497) + '...';
      }
      
      // Extract basic keywords (simple word frequency)
      const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'she', 'use', 'her', 'now', 'air', 'any', 'may', 'say'].includes(word));
      
      const wordFreq: { [key: string]: number } = {};
      words.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      keywords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([word]) => word);
    } else {
      summary = `Document summary for ${filename}`;
      keywords = ['document', 'file', filename.split('.')[0] || 'unknown'];
    }
    
    const processingTime = Date.now() - startTime;
    
    logger.info(`Fallback summary generated for ${filename} (${summary.length} chars)`);
    
    return {
      summary,
      keywords,
      confidence,
      processing_time: processingTime
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