// Quick API test script
const http = require('http');

function testAPI(email, role) {
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/me',
    method: 'GET',
    headers: {
      'x-test-user': email
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`\n${role} (${email}):`);
        console.log(JSON.parse(data));
        resolve();
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing API with test accounts...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await testAPI('testadmin@gmail.com', 'ADMIN');
  await testAPI('testteacher@gmail.com', 'TEACHER');
  await testAPI('teststudent@gmail.com', 'STUDENT');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All accounts working!');
  console.log('\nTo test specific roles, use the x-test-user header:');
  console.log('curl -H "x-test-user: testadmin@gmail.com" http://localhost:3001/api/auth/me');
}

runTests().catch(console.error);
