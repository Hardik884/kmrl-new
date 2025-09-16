const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const Document = require('../models/Document');
const InMemoryDocument = require('../models/InMemoryDocument');

// Check if PostgreSQL is available
let useInMemoryStorage = false;

const checkDatabaseAvailability = async () => {
  try {
    await Document.findAll();
    useInMemoryStorage = false;
    console.log('✅ Using PostgreSQL database');
  } catch (error) {
    useInMemoryStorage = true;
    console.log('⚠️  PostgreSQL not available, using in-memory storage');
  }
};

// Initialize database check
checkDatabaseAvailability();

// Get the appropriate model based on availability
const getDocumentModel = () => useInMemoryStorage ? InMemoryDocument : Document;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG), PDFs, and Word documents are allowed'));
    }
  }
});

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { department } = req.body;
    if (!department) {
      return res.status(400).json({ error: 'Department is required' });
    }

    // Extract text using OCR
    console.log('Starting OCR process...');
    const { data: { text } } = await Tesseract.recognize(req.file.path, 'eng', {
      logger: m => console.log(m)
    });

    // Save document to database (PostgreSQL or in-memory)
    const DocumentModel = getDocumentModel();
    const document = await DocumentModel.create({
      filename: req.file.originalname,
      department: department,
      extracted_text: text
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded and processed successfully',
      storage_type: useInMemoryStorage ? 'in-memory' : 'postgresql',
      document: {
        id: document.id,
        filename: document.filename,
        department: document.department,
        upload_date: document.upload_date,
        validation_status: document.validation_status,
        extracted_text_length: text.length
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error.message 
    });
  }
};

const getDocuments = async (req, res) => {
  try {
    const DocumentModel = getDocumentModel();
    const documents = await DocumentModel.findAll();
    res.json({
      success: true,
      storage_type: useInMemoryStorage ? 'in-memory' : 'postgresql',
      count: documents.length,
      documents: documents
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve documents',
      details: error.message 
    });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;
    const DocumentModel = getDocumentModel();
    const document = await DocumentModel.findById(id);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      storage_type: useInMemoryStorage ? 'in-memory' : 'postgresql',
      document: document
    });
  } catch (error) {
    console.error('Get document by ID error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve document',
      details: error.message 
    });
  }
};

const searchDocuments = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const DocumentModel = getDocumentModel();
    const documents = await DocumentModel.search(q);
    
    res.json({
      success: true,
      storage_type: useInMemoryStorage ? 'in-memory' : 'postgresql',
      query: q,
      count: documents.length,
      documents: documents
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Failed to search documents',
      details: error.message 
    });
  }
};

module.exports = {
  upload,
  uploadDocument,
  getDocuments,
  getDocumentById,
  searchDocuments
};