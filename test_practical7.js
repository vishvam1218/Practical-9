/**
 * Automated Test Suite for Practical 7
 * Tests bcrypt password hashing, JWT authentication, 401 unauthorized protection,
 * and server-side input validation middleware.
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const app = require('./server');

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = data ? JSON.stringify(data) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, { method, headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT, async () => {
    console.log(`\n=======================================================`);
    console.log(`🧪 Running Practical 7 Automated Verification Tests...`);
    console.log(`=======================================================\n`);

    let passed = 0;
    let total = 0;

    function assertTest(name, condition, details) {
      total++;
      if (condition) {
        passed++;
        console.log(`✅ [TEST ${total}] PASS: ${name}`);
      } else {
        console.error(`❌ [TEST ${total}] FAIL: ${name}`);
        console.error(`   Details:`, details);
      }
    }

    let authToken = null;
    const testUser = {
      name: "Vishvam Patel",
      email: `student_${Date.now()}@charusat.edu.in`,
      password: "securePassword123"
    };

    try {
      // Test 1: Register User
      const regRes = await makeRequest('POST', '/auth/register', testUser);
      assertTest("User Registration (POST /auth/register)", regRes.status === 201 && regRes.body.success, regRes.body);
      authToken = regRes.body.token;

      // Test 2: Reject Duplicate Email Registration
      const dupRes = await makeRequest('POST', '/auth/register', testUser);
      assertTest("Prevent Duplicate Email Registration", dupRes.status === 400 && !dupRes.body.success, dupRes.body);

      // Test 3: User Login
      const loginRes = await makeRequest('POST', '/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      assertTest("User Login & JWT Token Generation (POST /auth/login)", loginRes.status === 200 && loginRes.body.token, loginRes.body);

      // Test 4: Get Profile (/auth/me) with Valid Token
      const meRes = await makeRequest('GET', '/auth/me', null, authToken);
      assertTest("Retrieve User Profile via Decoded JWT (GET /auth/me)", meRes.status === 200 && meRes.body.user.email === testUser.email, meRes.body);

      // Test 5: Protected Route - Reject Task Access WITHOUT Authorization Token (401)
      const noTokenRes = await makeRequest('GET', '/tasks');
      assertTest("Auth Middleware: Reject Request Without Token (401 Unauthorized)", noTokenRes.status === 401 && !noTokenRes.body.success, noTokenRes.body);

      // Test 6: Protected Route - Reject Task Access WITH Invalid Token (401)
      const badTokenRes = await makeRequest('GET', '/tasks', null, 'invalid_fake_token_123');
      assertTest("Auth Middleware: Reject Invalid/Tampered Token (401 Unauthorized)", badTokenRes.status === 401 && !badTokenRes.body.success, badTokenRes.body);

      // Test 7: Validation Middleware - Reject Task Creation with Missing Title (400)
      const invalidTaskRes = await makeRequest('POST', '/tasks', { description: "Missing title field" }, authToken);
      assertTest("Validation Middleware: Reject Malformed Task Payload (400 Bad Request)", invalidTaskRes.status === 400 && !invalidTaskRes.body.success, invalidTaskRes.body);

      // Test 8: Create Valid Task with Token & Payload (201)
      const validTaskRes = await makeRequest('POST', '/tasks', {
        title: "Complete Practical 7 Authentication Lab",
        description: "JWT middleware, bcrypt password hashing, input validation",
        priority: "high"
      }, authToken);
      assertTest("Create Task with Valid Token & Sanitized Payload (201 Created)", validTaskRes.status === 201 && validTaskRes.body.success, validTaskRes.body);

      // Test 9: Get Tasks with Valid Token (200)
      const tasksRes = await makeRequest('GET', '/tasks', null, authToken);
      assertTest("Retrieve Protected Tasks List with Valid Token (200 OK)", tasksRes.status === 200 && tasksRes.body.count > 0, tasksRes.body);

      console.log(`\n=======================================================`);
      console.log(`📊 TEST RESULT: ${passed}/${total} Tests Passed!`);
      console.log(`=======================================================\n`);
    } catch (err) {
      console.error("💥 Test execution error:", err);
    } finally {
      server.close(() => {
        process.exit(passed === total ? 0 : 1);
      });
    }
  });
}

runTests();
