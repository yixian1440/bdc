const http = require('http');

// Simple test script to verify the POST /api/cases endpoint
async function testCreateCase() {
  try {
    console.log('=== Testing POST /api/cases endpoint ===');
    
    // Use a simple test case data
    const caseData = JSON.stringify({
      caseNumber: 'TEST002',
      caseType: '开发商转移',
      caseDate: '2024-12-11',
      applicant: '测试申请人',
      agent: '测试代理人',
      contactPhone: '13800138000',
      developer: '测试开发商',
      caseDescription: '测试案件描述'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/cases',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjUiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6Iui2hee6p-e7hOa4uuaen-mAkeW3peW6pSIsIm5hbWUiOiLnlKjmiYwifQ.fake_token_for_testing',
        'Content-Length': Buffer.byteLength(caseData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Create Case Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        
        if (res.statusCode === 200) {
          console.log('✅ Success! POST /api/cases is working correctly.');
        } else {
          console.log('❌ Error! POST /api/cases is returning an error.');
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request failed:', error.message);
    });
    
    req.write(caseData);
    req.end();
    
  } catch (error) {
    console.error('Test failed with exception:', error);
  }
}

// Run the test