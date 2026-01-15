// Create a test user with known credentials for testing
// Usage: npx tsx scripts/create-test-user.ts

import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { query, getUserByEmail } from "../src/lib/db.js";

dotenv.config();

async function createTestUser() {
  try {
    const testEmail = "test@summit.com";
    const testPassword = "test123"; // Known password for testing
    const testName = "Test User";

    // Check if user already exists
    const existingUser = await getUserByEmail(testEmail);
    
    if (existingUser) {
      console.log(`📋 User ${testEmail} already exists. Updating password...`);
      
      // Update password to known test password
      const passwordHash = await bcrypt.hash(testPassword, 10);
      await query(
        `UPDATE users 
         SET password_hash = $1,
             temp_password_hash = NULL,
             requires_password_change = false,
             name = $2,
             updated_at = NOW()
         WHERE LOWER(email) = $3`,
        [passwordHash, testName, testEmail.toLowerCase()]
      );
      
      console.log(`✅ Test user updated successfully!`);
      console.log(`📧 Email: ${testEmail}`);
      console.log(`🔑 Password: ${testPassword}`);
      console.log(`👤 Name: ${testName}`);
      console.log(`\n⚠️  This is a TEST account. Remove it before production!`);
      return;
    }

    // Create new test user
    console.log(`📋 Creating test user...`);
    
    const passwordHash = await bcrypt.hash(testPassword, 10);
    
    const result = await query(
      `INSERT INTO users (email, name, password_hash, requires_password_change, created_at, updated_at, subscription_status)
       VALUES (LOWER($1), $2, $3, false, NOW(), NOW(), 'trial')
       RETURNING id, email, name`,
      [testEmail, testName, passwordHash]
    );

    const user = result.rows[0];
    
    console.log(`✅ Test user created successfully!`);
    console.log(`📧 Email: ${testEmail}`);
    console.log(`🔑 Password: ${testPassword}`);
    console.log(`👤 Name: ${testName}`);
    console.log(`🆔 User ID: ${user.id}`);
    console.log(`\n⚠️  This is a TEST account. Remove it before production!`);
    console.log(`\n💡 You can now log in with:`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
  } catch (error: any) {
    console.error("❌ Error creating test user:", error);
    throw error;
  }
}

createTestUser()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
