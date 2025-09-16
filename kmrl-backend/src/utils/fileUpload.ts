import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from './logger';

// Ensure upload directory structure exists
const uploadDir = config.upload.uploadDir;
const createDirectoryStructure = () => {
  const dirs = [
    path.join(uploadDir, 'documents'),
    path.join(uploadDir, 'documents', 'temp'),
    path.join(uploadDir, 'documents', 'engineering'),
    path.join(uploadDir, 'documents', 'finance'),
    path.join(uploadDir, 'documents', 'hr'),
    path.join(uploadDir, 'documents', 'safety'),
    path.join(uploadDir, 'documents', 'legal'),
    path.join(uploadDir, 'documents', 'operations'),
    path.join(uploadDir, 'documents', 'management'),
    path.join(uploadDir, 'ml-queue')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
};

// Initialize directory structure
createDirectoryStructure();

// Configure multer storage with organized directory structure
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Organize files by department if specified in request
    const department = req.body.department || 'documents';
    const departmentDir = path.join(uploadDir, 'documents', department.toLowerCase());
    
    // Create department directory if it doesn't exist
    if (!fs.existsSync(departmentDir)) {
      fs.mkdirSync(departmentDir, { recursive: true });
    }
    
    cb(null, departmentDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and UUID
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uniqueId = uuidv4().substring(0, 8);
    const extension = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    const filename = `${timestamp}_${uniqueId}_${safeName}`;
    cb(null, filename);
  }
});

// File filter - Support multiple document formats
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xlsx', '.dwg', '.dxf', '.bmp', '.tiff'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${fileExtension} is not supported. Allowed types: ${allowedExtensions.join(', ')}`));
  }
};

// Create multer instance for document uploads
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // Maximum 10 files per request
  }
});

// File validation utilities
export class FileValidator {
  static isValidFileType(filename: string): boolean {
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.xlsx', '.dwg', '.dxf', '.bmp', '.tiff'];
    const extension = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(extension);
  }

  static isValidFileSize(fileSize: number): boolean {
    return fileSize <= config.upload.maxFileSize;
  }

  static getFileType(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    
    const typeMap: { [key: string]: string } = {
      '.pdf': 'document',
      '.doc': 'document',
      '.docx': 'document',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.png': 'image',
      '.bmp': 'image',
      '.tiff': 'image',
      '.xlsx': 'spreadsheet',
      '.dwg': 'cad',
      '.dxf': 'cad'
    };

    return typeMap[extension] || 'unknown';
  }

  static getMimeType(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    
    const mimeMap: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.dwg': 'application/acad',
      '.dxf': 'application/dxf'
    };

    return mimeMap[extension] || 'application/octet-stream';
  }
}

// Document processing utilities (with local file system)
export class DocumentProcessor {
  /**
   * Generate SHA-256 hash of file for duplicate detection
   */
  static generateFileHash(filePath: string): string {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      logger.error('Error generating file hash:', error);
      throw error;
    }
  }

  /**
   * Check if file already exists based on hash
   */
  static async checkDuplicate(filePath: string): Promise<boolean> {
    try {
      const hash = this.generateFileHash(filePath);
      // TODO: Check database for existing file with same hash
      // This would prevent storing duplicate files
      return false;
    } catch (error) {
      logger.error('Error checking for duplicates:', error);
      return false;
    }
  }

  static async extractMetadata(filePath: string): Promise<Record<string, any>> {
    try {
      const stats = fs.statSync(filePath);
      const hash = this.generateFileHash(filePath);
      
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        type: FileValidator.getFileType(filePath),
        extension: path.extname(filePath).toLowerCase(),
        originalName: path.basename(filePath),
        hash: hash
      };
    } catch (error) {
      logger.error('Error extracting document metadata:', error);
      throw error;
    }
  }

  static async validateDocument(filePath: string): Promise<boolean> {
    try {
      // Basic document validation - check if file exists and has content
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      const stats = fs.statSync(filePath);
      return stats.size > 0;
    } catch (error) {
      logger.error('Error validating document:', error);
      return false;
    }
  }

  static async moveToProcessingQueue(filePath: string, targetDir: string): Promise<string> {
    try {
      const filename = path.basename(filePath);
      const targetPath = path.join(targetDir, filename);
      
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      fs.renameSync(filePath, targetPath);
      logger.info(`Document moved to processing queue: ${targetPath}`);
      return targetPath;
    } catch (error) {
      logger.error('Error moving document to processing queue:', error);
      throw error;
    }
  }

  static async prepareDocumentForMLProcessing(filePath: string): Promise<{ 
    processedPath: string; 
    metadata: Record<string, any> 
  }> {
    try {
      // Validate document
      const isValidDocument = await DocumentProcessor.validateDocument(filePath);
      if (!isValidDocument) {
        throw new Error('Invalid document file');
      }

      // Extract metadata
      const metadata = await DocumentProcessor.extractMetadata(filePath);

      // Move to ML processing queue
      const mlQueueDir = path.join(uploadDir, 'ml-queue');
      const processedPath = await DocumentProcessor.moveToProcessingQueue(filePath, mlQueueDir);

      logger.info(`Document prepared for ML processing: ${processedPath}`);
      
      return {
        processedPath,
        metadata
      };
    } catch (error) {
      logger.error('Error preparing document for ML processing:', error);
      throw error;
    }
  }
}

// Error handling for document uploads
export const handleDocumentUploadError = (error: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return `File too large. Maximum size is ${config.upload.maxFileSize} bytes`;
      case 'LIMIT_FILE_COUNT':
        return 'Too many files. Maximum 10 files allowed';
      case 'LIMIT_UNEXPECTED_FILE':
        return 'Unexpected file field in upload';
      default:
        return `Upload error: ${error.message}`;
    }
  }
  return error.message || 'Unknown upload error';
};

// Upload configurations for different use cases
export const singleDocumentUpload = upload.single('document');
export const multipleDocumentUpload = upload.array('documents', 10);
export const fieldsDocumentUpload = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'attachments', maxCount: 9 }
]);