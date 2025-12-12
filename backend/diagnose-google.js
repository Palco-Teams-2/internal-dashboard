import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

console.log('🔍 Google Workspace Detailed Diagnostic\n');

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_WORKSPACE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
const ADMIN_EMAIL = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;
const CUSTOMER_ID = process.env.GOOGLE_WORKSPACE_CUSTOMER_ID || 'my_customer';

console.log('📋 Configuration:');
console.log('   Service Account:', SERVICE_ACCOUNT_EMAIL);
console.log('   Admin Email:', ADMIN_EMAIL);
console.log('   Customer ID:', CUSTOMER_ID);
console.log('   Private Key Length:', PRIVATE_KEY?.length);
console.log('');

async function testGoogleWorkspace() {
  try {
    console.log('1️⃣ Testing JWT Authorization...');
    
    const auth = new google.auth.JWT({
      email: SERVICE_ACCOUNT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
      subject: ADMIN_EMAIL
    });
    
    await auth.authorize();
    console.log('   ✅ JWT Authorization successful\n');
    
    console.log('2️⃣ Testing Admin API Access...');
    const admin = google.admin({ version: 'directory_v1', auth });
    
    // Test 1: Try to list users with customer ID
    try {
      console.log('   Trying with customer ID:', CUSTOMER_ID);
      const response = await admin.users.list({
        customer: CUSTOMER_ID,
        maxResults: 1
      });
      console.log('   ✅ SUCCESS with customer ID!');
      console.log('   Users found:', response.data.users?.length || 0);
      return;
    } catch (error) {
      console.log('   ❌ Failed with customer ID:', error.message);
    }
    
    // Test 2: Try to list users with 'my_customer'
    try {
      console.log('   Trying with "my_customer"...');
      const response = await admin.users.list({
        customer: 'my_customer',
        maxResults: 1
      });
      console.log('   ✅ SUCCESS with "my_customer"!');
      console.log('   Users found:', response.data.users?.length || 0);
      return;
    } catch (error) {
      console.log('   ❌ Failed with "my_customer":', error.message);
    }
    
    // Test 3: Try to get specific user (admin)
    try {
      console.log('   Trying to get admin user:', ADMIN_EMAIL);
      const response = await admin.users.get({
        userKey: ADMIN_EMAIL
      });
      console.log('   ✅ SUCCESS getting admin user!');
      console.log('   User:', response.data.primaryEmail);
      return;
    } catch (error) {
      console.log('   ❌ Failed getting admin user:', error.message);
    }
    
    console.log('\n❌ All tests failed. This indicates a permission issue.\n');
    
    console.log('🔧 Troubleshooting Steps:');
    console.log('');
    console.log('1. Verify Domain-Wide Delegation is enabled:');
    console.log('   - Go to: https://admin.google.com/ac/owl/domainwidedelegation');
    console.log('   - Find your service account:', SERVICE_ACCOUNT_EMAIL);
    console.log('   - Ensure it has scope: https://www.googleapis.com/auth/admin.directory.user');
    console.log('');
    console.log('2. Verify the Admin Email has permissions:');
    console.log('   - Admin email:', ADMIN_EMAIL);
    console.log('   - Should be a Super Admin or have User Management permissions');
    console.log('');
    console.log('3. Try getting the correct Customer ID:');
    console.log('   - Go to: https://admin.google.com/ac/accountsettings/profile');
    console.log('   - Look for "Customer ID" (should start with C)');
    console.log('   - Current value:', CUSTOMER_ID);
    
  } catch (error) {
    console.error('❌ Authorization Error:', error.message);
    if (error.message.includes('invalid_grant')) {
      console.log('\n🔧 This is likely a clock sync issue or the service account email is wrong.');
    }
  }
}

testGoogleWorkspace().catch(console.error);