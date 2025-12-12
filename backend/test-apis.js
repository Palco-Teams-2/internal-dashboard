import dotenv from 'dotenv';
import { google } from 'googleapis';
import axios from 'axios';
import twilio from 'twilio';

dotenv.config();

console.log('🧪 Testing API Connections...\n');

// Test 1: Google Workspace
async function testGoogleWorkspace() {
  try {
    console.log('1️⃣ Testing Google Workspace...');
    
    const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_WORKSPACE_SERVICE_ACCOUNT_EMAIL;
    const PRIVATE_KEY = process.env.GOOGLE_WORKSPACE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
    const ADMIN_EMAIL = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;
    
    const auth = new google.auth.JWT({
      email: SERVICE_ACCOUNT_EMAIL,
      key: PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/admin.directory.user'],
      subject: ADMIN_EMAIL
    });
    
    await auth.authorize();
    const admin = google.admin({ version: 'directory_v1', auth });
    
    // Try to list users (read-only test)
    const response = await admin.users.list({
      customer: process.env.GOOGLE_WORKSPACE_CUSTOMER_ID || 'my_customer',
      maxResults: 1
    });
    
    console.log('   ✅ Google Workspace: Connected');
    console.log(`   📊 Found ${response.data.users?.length || 0} users (sample)\n`);
    return true;
  } catch (error) {
    console.error('   ❌ Google Workspace: FAILED');
    console.error('   Error:', error.message);
    console.error('   Details:', error.response?.data || error.errors || '');
    return false;
  }
}

// Test 2: Calendly
async function testCalendly() {
  try {
    console.log('2️⃣ Testing Calendly...');
    
    const CALENDLY_API_KEY = process.env.CALENDLY_API_KEY;
    
    const response = await axios.get('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${CALENDLY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ Calendly: Connected');
    console.log(`   👤 User: ${response.data.resource.name}\n`);
    return true;
  } catch (error) {
    console.error('   ❌ Calendly: FAILED');
    console.error('   Error:', error.message);
    console.error('   Details:', error.response?.data || '');
    return false;
  }
}

// Test 3: Zoom
async function testZoom() {
  try {
    console.log('3️⃣ Testing Zoom...');
    
    const ZOOM_ACCOUNT_ID = process.env.ZOOM_ACCOUNT_ID;
    const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
    const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
    
    // Get OAuth token
    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'account_credentials',
          account_id: ZOOM_ACCOUNT_ID
        },
        auth: {
          username: ZOOM_CLIENT_ID,
          password: ZOOM_CLIENT_SECRET
        }
      }
    );
    
    const token = tokenResponse.data.access_token;
    
    // Get users (read-only test)
    const usersResponse = await axios.get(
      'https://api.zoom.us/v2/users',
      {
        params: { status: 'active', page_size: 1 },
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    console.log('   ✅ Zoom: Connected');
    console.log(`   📊 Found ${usersResponse.data.total_records} users\n`);
    return true;
  } catch (error) {
    console.error('   ❌ Zoom: FAILED');
    console.error('   Error:', error.message);
    console.error('   Details:', error.response?.data || '');
    return false;
  }
}

// Test 4: Twilio
async function testTwilio() {
  try {
    console.log('4️⃣ Testing Twilio...');
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    const client = twilio(accountSid, authToken);
    
    // Get account info (read-only test)
    const account = await client.api.accounts(accountSid).fetch();
    
    console.log('   ✅ Twilio: Connected');
    console.log(`   📊 Account: ${account.friendlyName}\n`);
    return true;
  } catch (error) {
    console.error('   ❌ Twilio: FAILED');
    console.error('   Error:', error.message);
    return false;
  }
}

// Test 5: GHL
async function testGHL() {
  try {
    console.log('5️⃣ Testing GHL...');
    
    const GHL_API_KEY = process.env.GHL_API_KEY;
    const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
    
    const response = await axios.get('https://services.leadconnectorhq.com/users/', {
      params: { locationId: GHL_LOCATION_ID },
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });
    
    const users = response.data.users || response.data;
    
    console.log('   ✅ GHL: Connected');
    console.log(`   📊 Found ${users.length} users\n`);
    return true;
  } catch (error) {
    console.error('   ❌ GHL: FAILED');
    console.error('   Error:', error.message);
    console.error('   Details:', error.response?.data || '');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const results = {
    googleWorkspace: await testGoogleWorkspace(),
    calendly: await testCalendly(),
    zoom: await testZoom(),
    twilio: await testTwilio(),
    ghl: await testGHL()
  };
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  Object.entries(results).forEach(([service, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${service}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(r => r);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (allPassed) {
    console.log('🎉 All APIs are working! Onboarding should work.');
  } else {
    console.log('⚠️  Some APIs failed. Fix these before testing onboarding.');
  }
}

runAllTests().catch(console.error);