const pool = require('./connection');

const initDatabase = async () => {
  try {
    // Create documents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        extracted_text TEXT,
        validation_status VARCHAR(20) DEFAULT 'pending'
      );
    `);

    // Create index for text search
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_extracted_text 
      ON documents USING gin(to_tsvector('english', extracted_text));
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase().then(() => {
    console.log('Database initialization completed');
    process.exit(0);
  }).catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
}

module.exports = initDatabase;