// Summit Database Setup Script
// Run this to create tables in the Summit database endpoint
// Uses SUMMIT_DB_* environment variables or falls back to defaults

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Try to load dotenv if available (optional - environment variables work without it)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, that's okay - we can use environment variables directly
}

// Summit database configuration
// REQUIRED: Set SUMMIT_DB_HOST environment variable with the new Summit database endpoint
if (!process.env.SUMMIT_DB_HOST) {
  console.error('\n❌ ERROR: SUMMIT_DB_HOST environment variable is required!');
  console.error('Please set SUMMIT_DB_HOST to your new Summit database endpoint.');
  console.error('Example: SUMMIT_DB_HOST=your-new-summit-endpoint.rds.amazonaws.com\n');
  process.exit(1);
}

const summitDbConfig = {
  host: process.env.SUMMIT_DB_HOST,
  port: parseInt(process.env.SUMMIT_DB_PORT || '5432'),
  database: process.env.SUMMIT_DB_NAME || 'Summit',
  user: process.env.SUMMIT_DB_USER || 'postgres',
  password: process.env.SUMMIT_DB_PASSWORD || 'Stacey1122',
  ssl: {
    rejectUnauthorized: false // RDS requires SSL but we can skip certificate validation for setup
  }
};

async function setupSummitDatabase() {
  const client = new Client(summitDbConfig);

  try {
    console.log('🚀 Summit Database Setup');
    console.log('========================');
    console.log(`Host: ${summitDbConfig.host}`);
    console.log(`Port: ${summitDbConfig.port}`);
    console.log(`Database: ${summitDbConfig.database}`);
    console.log(`User: ${summitDbConfig.user}`);
    console.log('');
    
    console.log('Connecting to Summit database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read SQL schema file (use schema.sql which contains all base tables)
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('\nCreating tables and schema...');
    await client.query(schemaSQL);
    console.log('✅ Schema created successfully!');

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
      console.log(`  ✅ ${row.table_name}`);
    });

    // Verify indexes
    const indexResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY indexname;
    `);

    console.log(`\n📑 Created indexes (${indexResult.rows.length} total):`);
    indexResult.rows.forEach(row => {
      console.log(`  ✅ ${row.indexname}`);
    });

    // Verify functions and triggers
    const functionResult = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `);

    if (functionResult.rows.length > 0) {
      console.log('\n⚙️  Created functions:');
      functionResult.rows.forEach(row => {
        console.log(`  ✅ ${row.routine_name}`);
      });
    }

    const triggerResult = await client.query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name;
    `);

    if (triggerResult.rows.length > 0) {
      console.log('\n🔔 Created triggers:');
      triggerResult.rows.forEach(row => {
        console.log(`  ✅ ${row.trigger_name}`);
      });
    }

    console.log('\n✅ Summit database setup complete!');
    console.log(`\nDatabase endpoint: ${summitDbConfig.host}:${summitDbConfig.port}/${summitDbConfig.database}`);

  } catch (error) {
    console.error('\n❌ Error setting up Summit database:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupSummitDatabase();

