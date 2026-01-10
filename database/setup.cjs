// Database Setup Script (CommonJS version)
// Run this to create tables in PostgreSQL

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: 5432,
  database: 'Summit',
  user: 'postgres',
  password: 'Stacey1122',
  ssl: {
    rejectUnauthorized: false // RDS requires SSL but we can skip certificate validation for setup
  }
};

async function setupDatabase() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read SQL schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('Creating tables...');
    await client.query(schemaSQL);
    console.log('✅ Tables created successfully!');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\n📊 Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n✅ Database setup complete!');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();

