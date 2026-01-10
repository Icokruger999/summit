// Quick Database Connection Test
// Run this to verify database connection before setup

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

async function testConnection() {
  const client = new Client(dbConfig);

  try {
    console.log('\n🔌 Testing database connection...');
    console.log(`   Host: ${dbConfig.host}`);
    console.log(`   Port: ${dbConfig.port}`);
    console.log(`   Database: ${dbConfig.database}`);
    console.log(`   User: ${dbConfig.user}\n`);
    
    await client.connect();
    console.log('✅ Connection successful!\n');

    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('📊 Database Info:');
    console.log(`   Current Time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL: ${result.rows[0].pg_version.split(',')[0]}\n`);

    // Check existing tables
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    console.log(`   Existing tables: ${tablesResult.rows[0].count}\n`);

    console.log('✅ Database is ready for setup!\n');

  } catch (error) {
    console.error('\n❌ Connection failed!\n');
    console.error(`   Error: ${error.message}\n`);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Host not found. Check:');
      console.error('   - Internet connection');
      console.error('   - Database hostname is correct\n');
    } else if (error.code === '28P01') {
      console.error('💡 Authentication failed. Check:');
      console.error('   - Username and password are correct\n');
    } else if (error.code === '3D000') {
      console.error('💡 Database does not exist. Check:');
      console.error('   - Database name is correct');
      console.error('   - Database has been created\n');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

testConnection();

