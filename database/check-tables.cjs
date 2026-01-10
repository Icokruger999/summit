const { Client } = require('pg');

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

async function checkTables() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('✅ Connected to Summit database\n');
    
    // Get all tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('📊 Tables in Summit database:');
    console.log('================================\n');
    
    const requiredTables = [
      'users',
      'meetings',
      'meeting_participants',
      'meeting_invitations',
      'attachments',
      'presence',
      'message_reads'
    ];
    
    const existingTables = result.rows.map(r => r.table_name);
    
    requiredTables.forEach(table => {
      const exists = existingTables.includes(table);
      console.log(`${exists ? '✅' : '❌'} ${table}`);
    });
    
    console.log('\n================================');
    console.log(`Total tables: ${result.rows.length}`);
    console.log(`Required tables: ${requiredTables.length}`);
    console.log(`Missing: ${requiredTables.filter(t => !existingTables.includes(t)).length}`);
    
    // Check if users table has email index
    const indexResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
      AND indexname = 'idx_users_email'
    `);
    
    console.log('\n📋 Indexes:');
    console.log(`  Email index on users: ${indexResult.rows.length > 0 ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkTables();




