const express = require('express');
const { 
  upload, 
  uploadDocument, 
  getDocuments, 
  getDocumentById, 
  searchDocuments 
} = require('../controllers/documentController');
const InMemoryDocument = require('../models/InMemoryDocument');

const router = express.Router();

// POST /upload - Upload document
router.post('/upload', upload.single('document'), uploadDocument);

// GET /documents - Get all documents
router.get('/documents', getDocuments);

// GET /documents/:id - Get document by ID
router.get('/documents/:id', getDocumentById);

// GET /search - Search documents
router.get('/search', searchDocuments);

// GET /stats - Get storage statistics (useful for demos)
router.get('/stats', (req, res) => {
  try {
    const stats = InMemoryDocument.getStats();
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get statistics',
      details: error.message 
    });
  }
});

module.exports = router;