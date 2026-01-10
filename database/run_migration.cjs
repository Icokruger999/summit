// Migration Script: Add job_title and phone columns to users table
// Run from project root: node database/run_migration.cjs

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

async function runMigration() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, 'migration_add_profile_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed successfully!');

    // Verify columns were added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('job_title', 'phone', 'company')
      ORDER BY column_name;
    `);

    console.log('\n📊 Profile columns in users table:');
    if (result.rows.length === 0) {
      console.log('  ⚠️  No profile columns found (they may not have been added)');
    } else {
      result.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name} (${row.data_type})`);
      });
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error running migration:', error.message);
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

runMigration();

