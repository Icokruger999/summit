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

async function viewAllRequests() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Show ALL chat requests
    const allRequests = await client.query(`
      SELECT cr.id, cr.status, cr.created_at,
        u1.email as requester_email,
        u2.email as requestee_email
      FROM chat_requests cr
      JOIN users u1 ON cr.requester_id = u1.id
      JOIN users u2 ON cr.requestee_id = u2.id
      ORDER BY cr.created_at DESC
    `);

    console.log('📋 ALL chat requests in database:');
    if (allRequests.rows.length === 0) {
      console.log('  (none)');
    } else {
      allRequests.rows.forEach(row => {
        console.log(`  [${row.status.toUpperCase()}] ${row.requester_email} -> ${row.requestee_email} (${row.created_at})`);
      });
    }

    console.log(`\nTotal: ${allRequests.rows.length} request(s)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

viewAllRequests();




