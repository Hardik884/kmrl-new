import { Request, Response } from 'express';
import { DocumentModel } from '../models/Document';
import { AIService } from '../services/AIService';
import { ProcessingQueue } from '../services/ProcessingQueue';
import logger from '../utils/logger';
import fs from 'fs';
import { Document } from '../types';

export class DocumentController {
  /**
   * Upload multiple documents with AI processing
   */
  static async uploadDocuments(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      const { project_id, department, urgency_level } = req.body;
      const user = req.user!;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded',
          timestamp: new Date().toISOString()
        });
      }

      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Department is required',
          timestamp: new Date().toISOString()
        });
      }

      const uploadedDocuments = [];
      const processingQueue = ProcessingQueue.getInstance();

      for (const file of files) {
        try {
          // Create document record in database
          const documentData = {
            filename: file.filename,
            original_filename: file.originalname,
            file_size: file.size,
            mime_type: file.mimetype,
            file_path: file.path,
            file_hash: '', // Will be generated during processing
            project_id: project_id ? parseInt(project_id) : null as any,
            department,
            uploaded_by: user.id,
            urgency_level: urgency_level || 'routine',
            processing_status: 'pending' as const
          };

          const document = await DocumentModel.create(documentData);
          
          // Add to processing queue for AI analysis
          await processingQueue.addDocumentForProcessing({
            documentId: document.id,
            filePath: file.path,
            userId: user.id,
            department
          });

          uploadedDocuments.push({
            id: document.id,
            filename: document.filename,
            original_filename: document.original_filename,
            file_size: document.file_size,
            mime_type: document.mime_type,
            department: document.department,
            urgency_level: document.urgency_level,
            processing_status: document.processing_status,
            created_at: document.created_at
          });

          logger.info(`Document uploaded: ${file.originalname} by user ${user.email}`);
        } catch (error) {
          logger.error(`Failed to process file ${file.originalname}:`, error);
          // Continue with other files even if one fails
        }
      }

      return res.status(201).json({
        success: true,
        message: `${uploadedDocuments.length} document(s) uploaded successfully`,
        documents: uploadedDocuments,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Document upload failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Document upload failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get list of documents with filtering and pagination
   */
  static async getDocuments(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { department, project_id, urgency_level, status, page = 1, limit = 20 } = req.query;

      const filters: any = {};
      
      // Users can only see documents from their department (unless admin)
      if (user.role !== 'admin') {
        filters.department = user.department;
      } else if (department) {
        filters.department = department as string;
      }

      if (project_id) filters.project_id = parseInt(project_id as string);
      if (urgency_level) filters.urgency_level = urgency_level as string;
      if (status) filters.processing_status = status as string;

      const result = await DocumentModel.getDocuments(
        filters,
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.json({
        success: true,
        documents: result.documents,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: result.total
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to retrieve documents:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve documents',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get document details by ID
   */
  static async getDocumentById(req: Request, res: Response) {
    try {
      const documentIdParam = req.params.id;
      if (!documentIdParam) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const documentId = parseInt(documentIdParam);
      if (isNaN(documentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document ID',
          timestamp: new Date().toISOString()
        });
      }

      const user = req.user!;
      const document = await DocumentModel.findById(documentId);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          timestamp: new Date().toISOString()
        });
      }

      // Check access permissions
      if (user.role !== 'admin' && document.department !== user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - document not in your department',
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        document,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to retrieve document:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve document',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Download document file
   */
  static async downloadDocument(req: Request, res: Response): Promise<void> {
    try {
      const documentIdParam = req.params.id;
      if (!documentIdParam) {
        res.status(400).json({
          success: false,
          message: 'Document ID is required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const documentId = parseInt(documentIdParam);
      if (isNaN(documentId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid document ID',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = req.user!;
      const document = await DocumentModel.findById(documentId);
      
      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check access permissions
      if (user.role !== 'admin' && document.department !== user.department) {
        res.status(403).json({
          success: false,
          message: 'Access denied - document not in your department',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Check if file exists
      if (!fs.existsSync(document.file_path)) {
        res.status(404).json({
          success: false,
          message: 'File not found on disk',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Set appropriate headers for download
      res.setHeader('Content-Type', document.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${document.original_filename}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(document.file_path);
      fileStream.pipe(res);

      logger.info(`Document downloaded: ${document.original_filename} by user ${user.email}`);

    } catch (error) {
      logger.error('Failed to download document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download document',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Delete document
   */
  static async deleteDocument(req: Request, res: Response) {
    try {
      const documentIdParam = req.params.id;
      if (!documentIdParam) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const documentId = parseInt(documentIdParam);
      if (isNaN(documentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document ID',
          timestamp: new Date().toISOString()
        });
      }

      const user = req.user!;
      const document = await DocumentModel.findById(documentId);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          timestamp: new Date().toISOString()
        });
      }

      // Check permissions - only admin or document uploader can delete
      if (user.role !== 'admin' && document.uploaded_by !== user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - you can only delete your own documents',
          timestamp: new Date().toISOString()
        });
      }

      // Delete file from disk
      if (fs.existsSync(document.file_path)) {
        fs.unlinkSync(document.file_path);
      }

      // Delete database record
      await DocumentModel.deleteDocument(documentId);

      logger.info(`Document deleted: ${document.original_filename} by user ${user.email}`);

      return res.json({
        success: true,
        message: 'Document deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to delete document:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Process document with AI (manual trigger)
   */
  static async processDocument(req: Request, res: Response) {
    try {
      const documentIdParam = req.params.id;
      if (!documentIdParam) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const documentId = parseInt(documentIdParam);
      if (isNaN(documentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document ID',
          timestamp: new Date().toISOString()
        });
      }

      const user = req.user!;
      const document = await DocumentModel.findById(documentId);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          timestamp: new Date().toISOString()
        });
      }

      // Check access permissions
      if (user.role !== 'admin' && document.department !== user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - document not in your department',
          timestamp: new Date().toISOString()
        });
      }

      // Trigger AI processing
      try {
        const aiResult = await AIService.classifyDocument('', document.file_path);
        
        return res.json({
          success: true,
          message: 'Document processed successfully',
          ai_result: {
            document_type: aiResult.document_type,
            confidence: aiResult.confidence,
            summary: aiResult.summary,
            keywords: aiResult.keywords
          },
          timestamp: new Date().toISOString()
        });

      } catch (aiError) {
        logger.error('AI processing failed:', aiError);
        return res.status(500).json({
          success: false,
          message: 'AI processing failed',
          error: aiError instanceof Error ? aiError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      logger.error('Failed to process document:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process document',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Smart search documents with AI-powered semantic search
   */
  static async searchDocuments(req: Request, res: Response) {
    try {
      const user = req.user!;
      const { q, department, document_type, urgency_level, limit = 20, page = 1 } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query (q) is required',
          timestamp: new Date().toISOString()
        });
      }

      const searchQuery = q.trim();
      logger.info(`Smart search initiated by user ${user.email}: "${searchQuery}"`);

      // Build search filters
      const filters: any = {};
      
      // Users can only search within their department unless admin
      if (user.role !== 'admin') {
        filters.department = user.department;
      } else if (department) {
        filters.department = department as string;
      }

      if (document_type) filters.document_type = document_type as string;
      if (urgency_level) filters.urgency_level = urgency_level as string;

      // Perform semantic search using DocumentModel
      const searchResults = await DocumentModel.searchDocuments({
        query: searchQuery,
        filters,
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      });

      // Enhance results with relevance scoring
      const enhancedResults = searchResults.documents.map(doc => ({
        ...doc,
        relevance_score: DocumentController.calculateRelevanceScore(searchQuery, doc),
        search_highlights: DocumentController.extractSearchHighlights(searchQuery, doc)
      }));

      // Sort by relevance score
      enhancedResults.sort((a, b) => b.relevance_score - a.relevance_score);

      return res.json({
        success: true,
        search_query: searchQuery,
        results: enhancedResults,
        total_found: searchResults.total,
        search_time_ms: Date.now() - Date.now(), // Placeholder for actual timing
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: searchResults.total,
          has_more: searchResults.total > (parseInt(page as string) * parseInt(limit as string))
        },
        search_suggestions: DocumentController.generateSearchSuggestions(searchQuery),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Smart search failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Search failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get AI-powered document summary and intelligence
   */
  static async getDocumentSummary(req: Request, res: Response) {
    try {
      const documentIdParam = req.params.id;
      if (!documentIdParam) {
        return res.status(400).json({
          success: false,
          message: 'Document ID is required',
          timestamp: new Date().toISOString()
        });
      }

      const documentId = parseInt(documentIdParam);
      if (isNaN(documentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document ID',
          timestamp: new Date().toISOString()
        });
      }

      const user = req.user!;
      const document = await DocumentModel.findById(documentId);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
          timestamp: new Date().toISOString()
        });
      }

      // Check access permissions
      if (user.role !== 'admin' && document.department !== user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied - document not in your department',
          timestamp: new Date().toISOString()
        });
      }

      // Generate enhanced AI summary if not already processed
      let aiSummary: any = {
        summary: document.ai_summary,
        keywords: document.ai_keywords,
        document_type: 'UNKNOWN',
        confidence: 0,
        language_detected: 'english',
        urgency_analysis: 'routine',
        compliance_tags: [],
        key_entities: {},
        action_items: [],
        related_departments: []
      };

      // If no AI processing done yet, trigger it
      if (!document.ai_summary) {
        try {
          const aiResult = await AIService.classifyDocument('', document.file_path);
          aiSummary = {
            summary: aiResult.summary,
            keywords: aiResult.keywords,
            document_type: aiResult.document_type,
            confidence: aiResult.confidence,
            language_detected: aiResult.language || 'english',
            urgency_analysis: document.urgency_level,
            compliance_tags: aiResult.compliance_flags || [],
            key_entities: aiResult.entities || {},
            action_items: [], // Not available in current AI result
            related_departments: aiResult.department_relevance || []
          };
          
          // Update document with AI results
          await DocumentModel.updateStatus(documentId, 'completed', {
            ai_summary: aiResult.summary,
            ai_keywords: aiResult.keywords
          });
          
        } catch (aiError) {
          logger.error('AI processing failed during summary generation:', aiError);
          // Continue with basic document info even if AI fails
        }
      }

      return res.json({
        success: true,
        document: {
          id: document.id,
          filename: document.original_filename,
          department: document.department,
          urgency_level: document.urgency_level,
          file_size: document.file_size,
          created_at: document.created_at,
          processing_status: document.processing_status
        },
        ai_intelligence: aiSummary,
        smart_insights: {
          estimated_read_time: DocumentController.estimateReadTime(document.file_size),
          document_category: DocumentController.categorizeDocument(document),
          priority_score: DocumentController.calculatePriorityScore(document, aiSummary),
          sharing_recommendations: DocumentController.getSharingRecommendations(document, aiSummary)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Failed to get document summary:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get document summary',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Helper methods for enhanced functionality
  private static calculateRelevanceScore(query: string, document: any): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    let score = 0;

    // Check filename match
    const filename = document.original_filename.toLowerCase();
    queryWords.forEach(word => {
      if (filename.includes(word)) score += 3;
    });

    // Check summary match
    if (document.ai_summary) {
      const summary = document.ai_summary.toLowerCase();
      queryWords.forEach(word => {
        if (summary.includes(word)) score += 2;
      });
    }

    // Check keywords match
    if (document.ai_keywords && Array.isArray(document.ai_keywords)) {
      queryWords.forEach(word => {
        document.ai_keywords.forEach((keyword: string) => {
          if (keyword.toLowerCase().includes(word)) score += 4;
        });
      });
    }

    // Check department relevance
    if (document.department.toLowerCase().includes(query.toLowerCase())) score += 1;

    return score;
  }

  private static extractSearchHighlights(query: string, document: any): string[] {
    const highlights: string[] = [];
    const queryWords = query.toLowerCase().split(/\s+/);

    // Highlight from summary
    if (document.ai_summary) {
      const summary = document.ai_summary;
      queryWords.forEach(word => {
        const regex = new RegExp(`\\b\\w*${word}\\w*\\b`, 'gi');
        const matches = summary.match(regex);
        if (matches) {
          matches.forEach((match: string) => {
            const contextStart = Math.max(0, summary.toLowerCase().indexOf(match.toLowerCase()) - 30);
            const contextEnd = Math.min(summary.length, summary.toLowerCase().indexOf(match.toLowerCase()) + match.length + 30);
            const context = summary.substring(contextStart, contextEnd);
            highlights.push(`...${context}...`);
          });
        }
      });
    }

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  private static generateSearchSuggestions(query: string): string[] {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    // KMRL-specific search suggestions
    const kmrlTerms = [
      'safety protocol', 'maintenance report', 'engineering drawing',
      'vendor invoice', 'board meeting', 'track inspection',
      'electrical system', 'rolling stock', 'emergency procedure',
      'monsoon operations', 'fire safety', 'passenger safety',
      'procurement order', 'budget allocation', 'training manual'
    ];

    kmrlTerms.forEach(term => {
      const firstWord = term.split(' ')[0];
      if (firstWord && (term.includes(queryLower) || queryLower.includes(firstWord))) {
        suggestions.push(term);
      }
    });

    return suggestions.slice(0, 5);
  }

  private static estimateReadTime(fileSize: number): string {
    // Rough estimation: 1MB ≈ 5 minutes reading time
    const minutes = Math.ceil((fileSize / (1024 * 1024)) * 5);
    return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  private static categorizeDocument(document: any): string {
    const filename = document.original_filename.toLowerCase();
    
    if (filename.includes('safety') || filename.includes('emergency')) return 'Safety Critical';
    if (filename.includes('maintenance') || filename.includes('inspection')) return 'Maintenance';
    if (filename.includes('drawing') || filename.includes('design')) return 'Engineering';
    if (filename.includes('invoice') || filename.includes('bill') || filename.includes('payment')) return 'Financial';
    if (filename.includes('policy') || filename.includes('procedure')) return 'Administrative';
    if (filename.includes('training') || filename.includes('manual')) return 'Training Material';
    
    return 'General Document';
  }

  private static calculatePriorityScore(document: any, aiSummary: any): number {
    let score = 0;
    
    // Urgency level scoring
    switch (document.urgency_level) {
      case 'critical': score += 10; break;
      case 'urgent': score += 7; break;
      case 'priority': score += 5; break;
      case 'routine': score += 2; break;
    }

    // Compliance tags boost
    if (aiSummary.compliance_tags && aiSummary.compliance_tags.length > 0) {
      score += aiSummary.compliance_tags.length * 2;
    }

    // Safety keywords boost
    const safetyKeywords = ['safety', 'emergency', 'critical', 'urgent', 'compliance'];
    if (aiSummary.keywords && Array.isArray(aiSummary.keywords)) {
      aiSummary.keywords.forEach((keyword: string) => {
        if (safetyKeywords.some(sk => keyword.toLowerCase().includes(sk))) {
          score += 3;
        }
      });
    }

    return Math.min(score, 100); // Cap at 100
  }

  private static getSharingRecommendations(document: any, aiSummary: any): string[] {
    const recommendations: string[] = [];
    
    // Based on document type and content
    if (aiSummary.document_type === 'SAFETY_NOTICE') {
      recommendations.push('Share with all station controllers');
      recommendations.push('Add to safety training materials');
    }
    
    if (aiSummary.document_type === 'MAINTENANCE_REPORT') {
      recommendations.push('Forward to preventive maintenance team');
      recommendations.push('Archive in maintenance knowledge base');
    }

    if (aiSummary.related_departments && aiSummary.related_departments.length > 0) {
      recommendations.push(`Notify: ${aiSummary.related_departments.join(', ')}`);
    }

    return recommendations.slice(0, 3);
  }
}