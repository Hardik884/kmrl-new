// In-memory storage for hackathon/demo purposes
let documents = [];
let nextId = 1;

class InMemoryDocument {
  static async create(documentData) {
    const { filename, department, extracted_text } = documentData;
    
    const document = {
      id: nextId++,
      filename,
      department,
      extracted_text,
      upload_date: new Date().toISOString(),
      validation_status: 'pending'
    };
    
    documents.push(document);
    return document;
  }

  static async findAll() {
    return documents.map(doc => ({
      ...doc,
      text_preview: doc.extracted_text ? doc.extracted_text.substring(0, 100) : ''
    }));
  }

  static async findById(id) {
    return documents.find(doc => doc.id === parseInt(id));
  }

  static async search(keyword) {
    const results = documents.filter(doc => 
      doc.extracted_text && 
      doc.extracted_text.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return results.map(doc => ({
      ...doc,
      highlighted_text: this.highlightText(doc.extracted_text, keyword)
    }));
  }

  static highlightText(text, keyword) {
    if (!text || !keyword) return text;
    
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  static async updateValidationStatus(id, status) {
    const doc = documents.find(doc => doc.id === parseInt(id));
    if (doc) {
      doc.validation_status = status;
      return doc;
    }
    return null;
  }

  static getStats() {
    return {
      total_documents: documents.length,
      storage_type: 'in-memory',
      departments: [...new Set(documents.map(doc => doc.department))],
      status_counts: {
        pending: documents.filter(doc => doc.validation_status === 'pending').length,
        processed: documents.filter(doc => doc.validation_status === 'processed').length,
        failed: documents.filter(doc => doc.validation_status === 'failed').length
      }
    };
  }
}

module.exports = InMemoryDocument;