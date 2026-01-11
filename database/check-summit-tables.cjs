// Check what tables exist in Summit database
const { Client } = require('pg');

const summitDbConfig = {
  host: process.env.SUMMIT_DB_HOST || process.env.DB_HOST || 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.SUMMIT_DB_PORT || process.env.DB_PORT || '5432'),
  database: process.env.SUMMIT_DB_NAME || process.env.DB_NAME || 'Summit',
  user: process.env.SUMMIT_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.SUMMIT_DB_PASSWORD || process.env.DB_PASSWORD || 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  }
};

async function checkTables() {
  const client = new Client(summitDbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to Summit database\n');

    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`📊 Existing tables (${result.rows.length}):`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    const expectedTables = ['users', 'meetings', 'meeting_participants', 'meeting_invitations', 'attachments', 'chat_requests'];
    const existingTableNames = result.rows.map(r => r.table_name);
    const missingTables = expectedTables.filter(t => !existingTableNames.includes(t));

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing tables: ${missingTables.join(', ')}`);
    } else {
      console.log('\n✅ All expected tables exist!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();

