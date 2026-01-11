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

async function clearPendingRequests() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Show current pending requests
    const currentRequests = await client.query(`
      SELECT cr.id, cr.status, cr.created_at,
        u1.email as requester_email,
        u2.email as requestee_email
      FROM chat_requests cr
      JOIN users u1 ON cr.requester_id = u1.id
      JOIN users u2 ON cr.requestee_id = u2.id
      WHERE cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `);

    console.log('\n📋 Current pending requests:');
    if (currentRequests.rows.length === 0) {
      console.log('  (none)');
    } else {
      currentRequests.rows.forEach(row => {
        console.log(`  ${row.requester_email} -> ${row.requestee_email} (${row.created_at})`);
      });
    }

    // Delete all pending requests
    const deleteResult = await client.query(`
      DELETE FROM chat_requests
      WHERE status = 'pending'
      RETURNING id
    `);

    console.log(`\n✅ Deleted ${deleteResult.rows.length} pending request(s)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.detail) {
      console.error('Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✅ Done!');
  }
}

clearPendingRequests();




