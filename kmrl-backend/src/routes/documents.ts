import { Router } from 'express';
import { upload } from '../utils/fileUpload';
import { DocumentController } from '../controllers/DocumentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All document routes require authentication
router.use(authenticateToken);

/**
 * Upload Documents Route
 * POST /api/documents/upload
 */
router.post('/upload', upload.array('files', 10), DocumentController.uploadDocuments);

/**
 * Get Documents List
 * GET /api/documents
 */
router.get('/', DocumentController.getDocuments);

/**
 * Smart Search Documents (AI-powered semantic search)
 * GET /api/documents/search?q=fire+extinguisher&department=SAFETY
 */
router.get('/search', DocumentController.searchDocuments);

/**
 * Get Document Details
 * GET /api/documents/:id
 */
router.get('/:id', DocumentController.getDocumentById);

/**
 * Get AI Summary and Intelligence
 * GET /api/documents/:id/summary
 */
router.get('/:id/summary', DocumentController.getDocumentSummary);

/**
 * Download Document
 * GET /api/documents/:id/download
 */
router.get('/:id/download', DocumentController.downloadDocument);

/**
 * Delete Document
 * DELETE /api/documents/:id
 */
router.delete('/:id', DocumentController.deleteDocument);

/**
 * Process Document with AI (Manual trigger)
 * POST /api/documents/:id/process
 */
router.post('/:id/process', DocumentController.processDocument);

export default router;