// Complete Database Setup and Verification Script
// Run this to create ALL tables and verify they work

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
    rejectUnauthorized: false
  }
};

const REQUIRED_TABLES = [
  'users',
  'meetings',
  'meeting_participants',
  'meeting_invitations',
  'attachments',
  'presence',
  'message_reads'
];

async function setupDatabase() {
  const client = new Client(dbConfig);

  try {
    console.log('🔌 Connecting to Summit database...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Database: ${dbConfig.database}\n`);
    
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Read and execute the complete schema
    console.log('📄 Reading complete schema file...');
    const schemaPath = path.join(__dirname, 'complete_schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔨 Creating/updating tables...');
    await client.query(schemaSQL);
    console.log('✅ Schema executed successfully!\n');

    // Verify all required tables exist
    console.log('🔍 Verifying required tables...\n');
    const verifyQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await client.query(verifyQuery);
    const existingTables = result.rows.map(row => row.table_name);

    console.log('📊 Database Tables Status:\n');
    
    let allTablesExist = true;
    REQUIRED_TABLES.forEach(tableName => {
      const exists = existingTables.includes(tableName);
      if (exists) {
        console.log(`   ✅ ${tableName}`);
      } else {
        console.log(`   ❌ ${tableName} - MISSING!`);
        allTablesExist = false;
      }
    });

    // Show any additional tables
    const additionalTables = existingTables.filter(t => !REQUIRED_TABLES.includes(t));
    if (additionalTables.length > 0) {
      console.log('\n   📦 Additional tables found:');
      additionalTables.forEach(t => console.log(`      • ${t}`));
    }

    console.log('\n' + '='.repeat(50));
    
    if (allTablesExist) {
      console.log('✅ SUCCESS! All required tables are present and ready.');
    } else {
      console.log('⚠️  WARNING! Some required tables are missing.');
      console.log('   Please check the error messages above.');
    }
    
    console.log('='.repeat(50) + '\n');

    // Test a simple query
    console.log('🧪 Testing database queries...');
    const testQuery = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`   Users table: ${testQuery.rows[0].count} users found`);
    
    const meetingsQuery = await client.query('SELECT COUNT(*) as count FROM meetings');
    console.log(`   Meetings table: ${meetingsQuery.rows[0].count} meetings found`);
    
    console.log('✅ Database queries working!\n');

    console.log('🎉 Database setup complete and verified!');
    console.log('\nYou can now start the backend server with:');
    console.log('   cd server && npm run dev\n');

  } catch (error) {
    console.error('\n❌ Error during database setup:\n');
    console.error(`   Message: ${error.message}`);
    
    if (error.detail) {
      console.error(`   Details: ${error.detail}`);
    }
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.hint) {
      console.error(`   Hint: ${error.hint}`);
    }
    
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check that PostgreSQL server is running');
    console.error('   2. Verify database credentials are correct');
    console.error('   3. Ensure you have CREATE TABLE permissions');
    console.error('   4. Check network connectivity to the database\n');
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the setup
console.log('\n' + '='.repeat(50));
console.log('   Summit Database Setup & Verification');
console.log('='.repeat(50) + '\n');

setupDatabase();

