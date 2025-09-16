const pool = require('../database/connection');

class Document {
  static async create(documentData) {
    const { filename, department, extracted_text } = documentData;
    
    const query = `
      INSERT INTO documents (filename, department, extracted_text)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [filename, department, extracted_text]);
    return result.rows[0];
  }

  static async findAll() {
    const query = `
      SELECT id, filename, department, upload_date, validation_status,
             SUBSTRING(extracted_text, 1, 100) as text_preview
      FROM documents
      ORDER BY upload_date DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT * FROM documents WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async search(keyword) {
    const query = `
      SELECT id, filename, department, upload_date, validation_status,
             ts_headline('english', extracted_text, plainto_tsquery('english', $1)) as highlighted_text
      FROM documents
      WHERE to_tsvector('english', extracted_text) @@ plainto_tsquery('english', $1)
      ORDER BY ts_rank(to_tsvector('english', extracted_text), plainto_tsquery('english', $1)) DESC
    `;
    
    const result = await pool.query(query, [keyword]);
    return result.rows;
  }

  static async updateValidationStatus(id, status) {
    const query = `
      UPDATE documents SET validation_status = $1 WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
  }
}

module.exports = Document;