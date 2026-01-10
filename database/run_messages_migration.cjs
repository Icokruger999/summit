const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: 5432,
  database: 'Summit',
  user: 'postgres',
  password: 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migration_add_messages_table.sql'),
      'utf8'
    );

    // Execute the migration
    console.log('Running messages table migration...');
    await client.query(migrationSQL);
    console.log('✅ Messages table migration completed successfully');

    // Verify the table was created
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Messages table structure:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();


