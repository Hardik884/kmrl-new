import { DocumentModel } from '../models/Document';
import { AIService } from './AIService';
import { DocumentProcessor } from '../utils/fileUpload';
import logger from '../utils/logger';
import path from 'path';
import fs from 'fs';

interface ProcessingJobData {
  documentId: number;
  filePath: string;
  userId: number;
  department: string;
}

export class ProcessingQueue {
  private static instance: ProcessingQueue;

  private constructor() {
    // Simplified version - no Redis queue for demo
  }

  static getInstance(): ProcessingQueue {
    if (!ProcessingQueue.instance) {
      ProcessingQueue.instance = new ProcessingQueue();
    }
    return ProcessingQueue.instance;
  }

  async addDocumentForProcessing(data: ProcessingJobData): Promise<void> {
    try {
      // Process immediately for demo (no background queue)
      await this.processDocument(data);
    } catch (error) {
      logger.error('Failed to process document:', error);
      throw error;
    }
  }

  private async processDocument(data: ProcessingJobData): Promise<void> {
    const { documentId, filePath } = data;
    
    try {
      logger.info(`Starting processing for document ${documentId}`);

      // Basic validation
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found');
      }

      // Generate file hash
      const fileHash = DocumentProcessor.generateFileHash(filePath);
      
      // Extract basic metadata
      const metadata = await DocumentProcessor.extractMetadata(filePath);

      // Prepare for AI processing
      const preparedData = await DocumentProcessor.prepareDocumentForMLProcessing(filePath);

      // Send to AI service for classification and summarization
      try {
        // Step 1: Update status to processing
        await DocumentModel.updateAIProcessingResults(documentId, {
          processing_status: 'processing'
        });

        // Step 2: Call external classification API
        logger.info(`Calling external classification API for document ${documentId}`);
        const classificationResult = await AIService.classifyDocument('', filePath);
        
        // Step 3: Call external summary API  
        logger.info(`Calling external summary API for document ${documentId}`);
        const summaryResult = await AIService.generateSummary('', filePath, classificationResult.document_type);
        
        // Step 4: Update document with combined AI results
        await DocumentModel.updateAIProcessingResults(documentId, {
          ai_classification: classificationResult.document_type,
          classification_confidence: classificationResult.confidence,
          ai_summary: summaryResult.summary,
          summary_confidence: summaryResult.confidence,
          ai_keywords: summaryResult.keywords,
          extracted_entities: classificationResult.entities || {},
          classification_api_response: {
            document_type: classificationResult.document_type,
            confidence: classificationResult.confidence,
            processing_time: classificationResult.processing_time
          },
          summary_api_response: {
            summary: summaryResult.summary,
            keywords: summaryResult.keywords,
            confidence: summaryResult.confidence,
            processing_time: summaryResult.processing_time
          },
          processing_status: 'completed'
        });
        
        logger.info(`AI processing completed and saved: ${classificationResult.document_type} (classification: ${classificationResult.confidence}, summary: ${summaryResult.confidence})`);
        
      } catch (aiError) {
        logger.warn('External AI processing failed, using basic classification:', aiError);
        
        // Update status to failed first
        await DocumentModel.updateAIProcessingResults(documentId, {
          processing_status: 'failed'
        });
        
        try {
          // Fallback to basic classification if external APIs fail
          const fallbackResult = await AIService.classifyDocument('', filePath);
          
          // Update with fallback results
          await DocumentModel.updateAIProcessingResults(documentId, {
            ai_classification: fallbackResult.document_type,
            classification_confidence: fallbackResult.confidence,
            ai_summary: fallbackResult.summary || '',
            ai_keywords: fallbackResult.keywords || [],
            extracted_entities: fallbackResult.entities || {},
            processing_status: 'completed'
          });
          
          logger.info(`Fallback processing completed and saved: ${fallbackResult.document_type}`);
        } catch (fallbackError) {
          logger.error('Fallback processing also failed:', fallbackError);
          throw fallbackError;
        }
      }

      logger.info(`Processing completed for document ${documentId}`);
    } catch (error) {
      logger.error(`Processing failed for ${documentId}:`, error);
      throw error;
    }
  }

  async getQueueStats(): Promise<any> {
    // Return mock stats for demo
    return {
      waiting: 0,
      active: 0,
      completed: 5,
      failed: 0,
      total: 5
    };
  }

  async closeQueue(): Promise<void> {
    logger.info('Processing queue closed (demo mode)');
  }
}

export default ProcessingQueue;