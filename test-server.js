// Simple test script to verify Django server is working
const axios = require('axios');

async function testServer() {
  const baseURL = 'http://localhost:8000';
  
  console.log('Testing Django server connectivity...');
  
  try {
    // Test root endpoint
    const response = await axios.get(`${baseURL}/`);
    console.log('✅ Root endpoint works:', response.status);
  } catch (error) {
    console.log('❌ Root endpoint failed:', error.message);
  }

  try {
    // Test events endpoint with sample data
    const response = await axios.get(`${baseURL}/api/events/`, {
      params: {
        customer_org_id: 'org_4m6zyrass98vvtk3xh5kcwcmaf',
        account_id: 'account_31crr1tcp2bmcv1fk6pcm0k6ag',
        page: 1,
        page_size: 5
      }
    });
    console.log('✅ Events endpoint works:', response.status);
    console.log('✅ Sample events returned:', response.data.events?.length || 0);
  } catch (error) {
    console.log('❌ Events endpoint failed:', error.message);
    if (error.response) {
      console.log('❌ Response status:', error.response.status);
      console.log('❌ Response data:', error.response.data);
    }
  }
}

testServer(); 