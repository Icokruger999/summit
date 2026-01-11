// Check if there's data in the Summit database
const { Client } = require('pg');

const dbConfig = {
  host: process.env.SUMMIT_DB_HOST || 'summit-db.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
  port: parseInt(process.env.SUMMIT_DB_PORT || '5432'),
  database: process.env.SUMMIT_DB_NAME || 'Summit',
  user: process.env.SUMMIT_DB_USER || 'postgres',
  password: process.env.SUMMIT_DB_PASSWORD || 'Stacey1122',
  ssl: {
    rejectUnauthorized: false
  }
};

async function checkDatabaseData() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`Found ${tables.length} tables:\n`);

    // Check data in each table
    for (const table of tables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}";`);
        const count = parseInt(countResult.rows[0].count);
        
        if (count > 0) {
          console.log(`✅ ${table}: ${count} row(s)`);
          
          // Show sample data for tables with data
          if (count <= 10) {
            const sampleResult = await client.query(`SELECT * FROM "${table}" LIMIT 5;`);
            console.log(`   Sample data:`, JSON.stringify(sampleResult.rows, null, 2));
          } else {
            const sampleResult = await client.query(`SELECT * FROM "${table}" LIMIT 3;`);
            console.log(`   Sample (first 3 rows):`, JSON.stringify(sampleResult.rows, null, 2));
          }
        } else {
          console.log(`⚪ ${table}: 0 rows (empty)`);
        }
      } catch (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
      }
      console.log('');
    }

    // Summary
    console.log('\n============================================');
    console.log('Database Summary:');
    console.log('============================================');
    
    let totalRows = 0;
    let tablesWithData = 0;
    
    for (const table of tables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}";`);
        const count = parseInt(countResult.rows[0].count);
        totalRows += count;
        if (count > 0) tablesWithData++;
      } catch (error) {
        // Skip errors
      }
    }
    
    console.log(`Total tables: ${tables.length}`);
    console.log(`Tables with data: ${tablesWithData}`);
    console.log(`Tables empty: ${tables.length - tablesWithData}`);
    console.log(`Total rows across all tables: ${totalRows}`);
    
    if (totalRows > 0) {
      console.log('\n✅ Database contains data!');
    } else {
      console.log('\n⚪ Database is empty (no data in any table)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkDatabaseData();

