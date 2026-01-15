import { query, getUserByEmail } from '../src/lib/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function deleteUser(email: string) {
  try {
    // Get user first to confirm they exist
    const user = await getUserByEmail(email);
    if (!user) {
      console.error(`❌ User with email ${email} not found.`);
      return;
    }

    console.log(`📋 Found user: ${user.name || user.email} (${user.id})`);

    // Delete user (cascade will handle related records)
    await query(
      `DELETE FROM users WHERE id = $1`,
      [user.id]
    );

    console.log(`✅ User ${email} deleted successfully.`);
  } catch (error: any) {
    console.error('❌ Error deleting user:', error);
    throw error;
  }
}

const emailArg = process.argv[2];
if (!emailArg) {
  console.log('Usage: npx tsx scripts/delete-user.ts <email>');
  process.exit(1);
}

deleteUser(emailArg)
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
