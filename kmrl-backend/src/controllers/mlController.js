const Document = require('../models/Document');
const InMemoryDocument = require('../models/InMemoryDocument');

// Check which storage to use (same as documentController)
let useInMemoryStorage = false;
const checkDatabaseAvailability = async () => {
  try {
    await Document.findAll();
    useInMemoryStorage = false;
  } catch (error) {
    useInMemoryStorage = true;
  }
};
checkDatabaseAvailability();

const getDocumentModel = () => useInMemoryStorage ? InMemoryDocument : Document;

const extractMLData = async (req, res) => {
  try {
    const { document_id } = req.body;
    
    if (!document_id) {
      return res.status(400).json({ error: 'document_id is required' });
    }

    // Verify document exists
    const DocumentModel = getDocumentModel();
    const document = await DocumentModel.findById(document_id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Simulate ML processing with fake results
    const fakeMLResults = generateFakeMLResults(document.extracted_text, document.filename);

    // Update document validation status
    await DocumentModel.updateValidationStatus(document_id, 'processed');

    res.json({
      success: true,
      storage_type: useInMemoryStorage ? 'in-memory' : 'postgresql',
      document_id: document_id,
      ml_results: fakeMLResults,
      processing_status: 'completed'
    });

  } catch (error) {
    console.error('ML extraction error:', error);
    res.status(500).json({ 
      error: 'Failed to process ML extraction',
      details: error.message 
    });
  }
};

const generateFakeMLResults = (extractedText, filename) => {
  // Generate realistic fake ML results based on content
  const text = extractedText.toLowerCase();
  const results = {
    document_type: 'unknown',
    confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
    extracted_fields: {}
  };

  // Detect document type based on keywords
  if (text.includes('invoice') || text.includes('bill') || text.includes('amount due')) {
    results.document_type = 'invoice';
    results.extracted_fields = {
      invoice_number: `INV-${Math.floor(Math.random() * 100000)}`,
      amount: `$${(Math.random() * 5000 + 100).toFixed(2)}`,
      due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      vendor: extractVendorName(text) || 'ABC Company Ltd.'
    };
  } else if (text.includes('receipt') || text.includes('purchase') || text.includes('transaction')) {
    results.document_type = 'receipt';
    results.extracted_fields = {
      receipt_number: `RCP-${Math.floor(Math.random() * 100000)}`,
      total_amount: `$${(Math.random() * 500 + 10).toFixed(2)}`,
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      merchant: extractVendorName(text) || 'Store XYZ'
    };
  } else if (text.includes('contract') || text.includes('agreement') || text.includes('terms')) {
    results.document_type = 'contract';
    results.extracted_fields = {
      contract_id: `CTR-${Math.floor(Math.random() * 100000)}`,
      parties: ['Company A', 'Company B'],
      effective_date: new Date().toISOString().split('T')[0],
      duration: `${Math.floor(Math.random() * 36 + 12)} months`
    };
  } else if (text.includes('report') || text.includes('analysis') || text.includes('summary')) {
    results.document_type = 'report';
    results.extracted_fields = {
      report_type: 'Business Report',
      date_generated: new Date().toISOString().split('T')[0],
      pages: Math.floor(Math.random() * 50 + 5),
      key_metrics: {
        revenue: `$${(Math.random() * 1000000 + 100000).toFixed(0)}`,
        growth: `${(Math.random() * 20 + 5).toFixed(1)}%`
      }
    };
  } else {
    // Default document type
    results.document_type = 'general';
    results.extracted_fields = {
      word_count: extractedText.split(' ').length,
      language: 'English',
      creation_date: new Date().toISOString().split('T')[0],
      file_type: filename.split('.').pop().toUpperCase()
    };
  }

  // Add some common fields
  results.extracted_fields.processing_time = `${(Math.random() * 5 + 1).toFixed(2)}s`;
  results.extracted_fields.text_length = extractedText.length;

  return results;
};

const extractVendorName = (text) => {
  // Simple vendor name extraction (fake implementation)
  const vendors = ['TechCorp Inc.', 'Global Solutions Ltd.', 'Innovate Systems', 'Prime Enterprises', 'Elite Services'];
  return vendors[Math.floor(Math.random() * vendors.length)];
};

module.exports = {
  extractMLData
};