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
        const aiResult = await AIService.classifyDocument('', filePath);
        
        // Update document with AI results (simplified for demo)
        logger.info(`AI processing completed: ${aiResult.document_type} (confidence: ${aiResult.confidence})`);
        
      } catch (aiError) {
        logger.warn('AI processing failed, using basic classification:', aiError);
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