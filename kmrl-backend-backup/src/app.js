const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const initDatabase = require('./database/init');
const documentRoutes = require('./routes/documents');
const mlRoutes = require('./routes/ml');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

// Routes
app.use('/', documentRoutes);
app.use('/ml', mlRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Automated Document Overload Solution API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Automated Document Overload Solution API',
    version: '1.0.0',
    description: 'Minimal Express.js backend for document processing with OCR and ML',
    endpoints: {
      'POST /upload': 'Upload document (PDF/IMG/DOCX) with OCR processing',
      'GET /documents': 'Get list of all documents',
      'GET /documents/:id': 'Get document details by ID',
      'GET /search?q=keyword': 'Search documents by text content',
      'POST /ml/extract': 'Extract ML data from document (fake implementation)',
      'GET /health': 'Health check endpoint'
    },
    sample_usage: {
      upload: 'curl -X POST -F "document=@file.pdf" -F "department=IT" http://localhost:3000/upload',
      search: 'curl "http://localhost:3000/search?q=invoice"',
      ml_extract: 'curl -X POST -H "Content-Type: application/json" -d \'{"document_id": 1}\' http://localhost:3000/ml/extract'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} is not a valid endpoint`
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('🔄 Checking database availability...');
    
    // Try to initialize PostgreSQL database
    try {
      await initDatabase();
      console.log('✅ PostgreSQL database initialized successfully');
    } catch (error) {
      console.log('⚠️  PostgreSQL not available, using in-memory storage for hackathon mode');
      console.log('   This is perfect for demos and development!');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Automated Document Overload Solution API running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 API info: http://localhost:${PORT}/`);
      console.log(`📁 Upload endpoint: http://localhost:${PORT}/upload`);
      console.log(`🔍 Search endpoint: http://localhost:${PORT}/search?q=keyword`);
      console.log(`🤖 ML endpoint: http://localhost:${PORT}/ml/extract`);
      console.log(`\n💡 Ready for hackathon! Upload some documents to get started.`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🔄 Shutting down server gracefully...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;