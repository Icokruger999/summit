// Setup Missing Tables Script
// Creates only tables that don't exist yet

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'Summit',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  }
};

async function setupMissingTables() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Check which tables exist
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const tableNames = existingTables.rows.map(r => r.table_name);
    console.log('\n📊 Existing tables:', tableNames.join(', '));

    // Create chat_requests table if it doesn't exist
    if (!tableNames.includes('chat_requests')) {
      console.log('\nCreating chat_requests table...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS chat_requests (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          requester_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          requestee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
          status TEXT DEFAULT 'pending',
          meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
          meeting_title TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(requester_id, requestee_id)
        )
      `);
      
      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_requests_requester_id ON chat_requests(requester_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_requests_requestee_id ON chat_requests(requestee_id)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_requests_status ON chat_requests(status)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_chat_requests_meeting_id ON chat_requests(meeting_id)`);
      
      // Create trigger function if it doesn't exist
      await client.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);
      
      // Create trigger if it doesn't exist
      await client.query(`
        DROP TRIGGER IF EXISTS update_chat_requests_updated_at ON chat_requests;
        CREATE TRIGGER update_chat_requests_updated_at BEFORE UPDATE ON chat_requests
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `);
      
      console.log('✅ chat_requests table created!');
    } else {
      console.log('✅ chat_requests table already exists');
    }

    // Verify all required tables exist
    const requiredTables = ['users', 'meetings', 'meeting_participants', 'meeting_invitations', 'attachments', 'chat_requests', 'presence'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Missing tables:', missingTables.join(', '));
      console.log('Run the full schema setup: node database/setup.cjs');
    } else {
      console.log('\n✅ All required tables exist!');
    }

    // Verify chat_requests table structure
    const chatRequestsColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'chat_requests'
      ORDER BY ordinal_position
    `);
    
    if (chatRequestsColumns.rows.length > 0) {
      console.log('\n📋 chat_requests table columns:');
      chatRequestsColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });
    }

    console.log('\n✅ Setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
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

setupMissingTables();



