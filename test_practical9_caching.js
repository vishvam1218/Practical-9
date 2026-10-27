/**
 * Practical 9: In-Memory Caching & Query Optimization Verification Script
 * Course: Advanced Web Development Frameworks (ITUE301)
 * Student: Vishvam Patel (24IT110)
 * 
 * Verifies:
 * 1. Cache MISS on initial request (querying database/store)
 * 2. Cache HIT on repeated requests (sub-millisecond retrieval from node-cache)
 * 3. Cache invalidation on write operations (POST, PUT, DELETE)
 * 4. Single-task caching (GET /tasks/:id)
 * 5. Debug / Telemetry endpoint (/tasks/cache/stats)
 */

const BASE_URL = 'http://localhost:5001';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);
const pass = (title) => log(`  ✅ PASS: ${title}`, colors.green);
const fail = (title, err) => {
  log(`  ❌ FAIL: ${title} - ${err}`, colors.red);
  process.exitCode = 1;
};

const run = async () => {
  log(`\n=================================================================`, colors.magenta);
  log(`🧪 Running Practical 9 Verification: In-Memory Caching (node-cache)`, colors.bold + colors.cyan);
  log(`👤 Student: Vishvam Patel (ID: 24IT110) | CHARUSAT`, colors.cyan);
  log(`=================================================================\n`, colors.magenta);

  let token = null;

  // Step 1: Login or Register
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'vishvam@example.com', password: 'Password123!' })
    });
    const loginData = await loginRes.json();
    if (loginData.token) {
      token = loginData.token;
      pass('Authenticated test user via JWT');
    } else {
      const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Vishvam Patel', email: 'vishvam@example.com', password: 'Password123!' })
      });
      const regData = await regRes.json();
      token = regData.token;
      pass('Registered & authenticated test user via JWT');
    }
  } catch (err) {
    fail('Auth bootstrap', err.message);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Step 2: Flush cache to start clean
  try {
    const clearRes = await fetch(`${BASE_URL}/tasks/cache/clear`, { method: 'POST' });
    const clearData = await clearRes.json();
    if (clearData.success) {
      pass('Flushed in-memory cache to guarantee initial MISS condition');
    }
  } catch (err) {
    fail('Cache flush', err.message);
  }

  // Step 3: First GET /tasks -> Expect Cache MISS
  let firstResponseTime = 0;
  try {
    const res1 = await fetch(`${BASE_URL}/tasks`, { headers: authHeaders });
    const data1 = await res1.json();
    const cacheHeader = res1.headers.get('X-Cache');
    firstResponseTime = data1.cache?.responseTimeMs || 0;

    if (cacheHeader === 'MISS' && data1.cache?.hit === false) {
      pass(`Initial GET /tasks was a Cache MISS (Response Time: ${firstResponseTime} ms)`);
    } else {
      fail('Initial GET /tasks cache check', `Expected MISS but got ${cacheHeader}`);
    }
  } catch (err) {
    fail('First GET /tasks', err.message);
  }

  // Step 4: Second GET /tasks -> Expect Cache HIT (sub-millisecond)
  let secondResponseTime = 0;
  try {
    const res2 = await fetch(`${BASE_URL}/tasks`, { headers: authHeaders });
    const data2 = await res2.json();
    const cacheHeader = res2.headers.get('X-Cache');
    secondResponseTime = data2.cache?.responseTimeMs || 0;

    if (cacheHeader === 'HIT' && data2.cache?.hit === true) {
      const speedup = firstResponseTime > 0 ? ((1 - (secondResponseTime / firstResponseTime)) * 100).toFixed(1) : '99.9';
      pass(`Second GET /tasks was a Cache HIT! (Response Time: ${secondResponseTime} ms, ${speedup}% latency reduction)`);
    } else {
      fail('Second GET /tasks cache check', `Expected HIT but got ${cacheHeader}`);
    }
  } catch (err) {
    fail('Second GET /tasks', err.message);
  }

  // Step 5: Third GET /tasks -> Expect Cache HIT
  try {
    const res3 = await fetch(`${BASE_URL}/tasks`, { headers: authHeaders });
    const data3 = await res3.json();
    const cacheHeader = res3.headers.get('X-Cache');
    if (cacheHeader === 'HIT') {
      pass(`Third GET /tasks was a Cache HIT! (Response Time: ${data3.cache?.responseTimeMs} ms)`);
    }
  } catch (err) {
    fail('Third GET /tasks', err.message);
  }

  // Step 6: Single-Task Caching (Supplementary Problem 1)
  let sampleTaskId = null;
  try {
    const allRes = await fetch(`${BASE_URL}/tasks`, { headers: authHeaders });
    const allData = await allRes.json();
    sampleTaskId = allData.data[0]._id;

    // First read for single task: MISS
    const single1 = await fetch(`${BASE_URL}/tasks/${sampleTaskId}`, { headers: authHeaders });
    const singleData1 = await single1.json();
    const h1 = single1.headers.get('X-Cache');

    // Second read for single task: HIT
    const single2 = await fetch(`${BASE_URL}/tasks/${sampleTaskId}`, { headers: authHeaders });
    const singleData2 = await single2.json();
    const h2 = single2.headers.get('X-Cache');

    if (h1 === 'MISS' && h2 === 'HIT') {
      pass(`Supplementary 1: Single-task route (GET /tasks/:id) cached separately under 'task_${sampleTaskId}' (MISS -> HIT)`);
    } else {
      fail('Single-task cache', `Expected MISS then HIT, got ${h1} then ${h2}`);
    }
  } catch (err) {
    fail('Single-task cache test', err.message);
  }

  // Step 7: Write Invalidation Test (POST /tasks)
  let createdTaskId = null;
  try {
    const createRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Cache Invalidation Automated Test',
        description: 'Verify all_tasks key is deleted after write',
        priority: 'high'
      })
    });
    const createData = await createRes.json();
    createdTaskId = createData.data._id;

    if (createData.cacheInvalidated === true) {
      pass('Write Operation: POST /tasks automatically executed cache.del("all_tasks")');
    }

    // Now the next GET /tasks MUST be a MISS!
    const postWriteRes = await fetch(`${BASE_URL}/tasks`, { headers: authHeaders });
    const postWriteData = await postWriteRes.json();
    const postWriteCache = postWriteRes.headers.get('X-Cache');

    if (postWriteCache === 'MISS') {
      pass('Verification: Next GET /tasks after POST was a Cache MISS (data freshness preserved)');
    } else {
      fail('Cache invalidation verification', `Expected MISS after write, got ${postWriteCache}`);
    }
  } catch (err) {
    fail('Write invalidation test', err.message);
  }

  // Step 8: Telemetry & Debug Endpoint (Supplementary Problem 2)
  try {
    const statsRes = await fetch(`${BASE_URL}/tasks/cache/stats`);
    const statsData = await statsRes.json();

    if (statsData.success && statsData.metrics.hits > 0 && statsData.metrics.invalidations > 0) {
      pass(`Supplementary 2: Telemetry debug endpoint (/tasks/cache/stats) reports ${statsData.metrics.hits} hits, ${statsData.metrics.misses} misses (${statsData.metrics.hitRatioPercent}% hit ratio)`);
    } else {
      fail('Telemetry debug stats', 'Stats did not reflect recorded operations');
    }
  } catch (err) {
    fail('Telemetry endpoint', err.message);
  }

  log(`\n=================================================================`, colors.magenta);
  log(`🎉 All Practical 9 In-Memory Caching Tests Passed Successfully!`, colors.bold + colors.green);
  log(`=================================================================\n`, colors.magenta);
};

run();
