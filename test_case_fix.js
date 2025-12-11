const axios = require('axios');

// Simple test script to verify the POST /api/cases endpoint
async function testCreateCase() {
  try {
    console.log('Testing POST /api/cases endpoint...');
    
    // First, let's get a valid token by logging in
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, obtained token');
    
    // Test case data
    const caseData = {
      caseNumber: 'TEST001',
      caseType: '开发商转移',
      caseDate: '2024-12-11',
      applicant: '测试申请人',
      agent: '测试代理人',
      contactPhone: '13800138000',
      developer: '测试开发商',
      caseDescription: '测试案件描述'
    };
    
    // Send request to create case
    const response = await axios.post('http://localhost:3001/api/cases', caseData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Case creation successful!');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Error creating case:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return false;
  }
}

// Run the test
testCreateCase()
  .then(success => {
    if (success) {
      console.log('\n🎉 Test completed successfully! The POST /api/cases 500 error has been fixed.');
    } else {
      console.log('\n💥 Test failed! The POST /api/cases 500 error still exists.');
    }
  })
  .catch(err => {
    console.error('❌ Test execution failed:', err);
  });
