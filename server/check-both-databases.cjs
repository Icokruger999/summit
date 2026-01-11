// Check both databases for user accounts
const { Client } = require('pg');

const databases = [
  {
    name: 'Main Database (codingeverest-new)',
    config: {
      host: 'codingeverest-new.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
      port: 5432,
      database: 'Summit',
      user: 'postgres',
      password: 'Stacey1122',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Summit Database (summit-db)',
    config: {
      host: 'summit-db.cl4qcomc6fj0.eu-west-1.rds.amazonaws.com',
      port: 5432,
      database: 'Summit',
      user: 'postgres',
      password: 'Stacey1122',
      ssl: { rejectUnauthorized: false }
    }
  }
];

async function checkDatabase(dbInfo) {
  const client = new Client(dbInfo.config);
  
  try {
    await client.connect();
    const result = await client.query('SELECT COUNT(*) as count FROM users;');
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      const usersResult = await client.query('SELECT id, email, name, created_at FROM users ORDER BY created_at DESC LIMIT 5;');
      return { count, users: usersResult.rows };
    }
    
    return { count, users: [] };
  } catch (error) {
    return { error: error.message };
  } finally {
    await client.end();
  }
}

async function checkAll() {
  console.log('============================================');
  console.log('Checking Both Databases for Users');
  console.log('============================================\n');

  for (const dbInfo of databases) {
    console.log(`Checking: ${dbInfo.name}`);
    console.log(`Host: ${dbInfo.config.host}\n`);
    
    const result = await checkDatabase(dbInfo);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error}\n`);
    } else if (result.count > 0) {
      console.log(`✅ Found ${result.count} user(s)!\n`);
      console.log('Recent users:');
      result.users.forEach(user => {
        console.log(`  - ${user.email} (${user.name || 'No name'}) - Created: ${user.created_at}`);
      });
      console.log('');
    } else {
      console.log(`⚪ No users found (0 users)\n`);
    }
    console.log('---\n');
  }
}

checkAll().catch(console.error);

