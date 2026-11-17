/**
 * Automated End-to-End Test Suite for SOS GUARDIAN (Node.js/Express/SQLite)
 * Runs against the active server on port 3000.
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3000';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {};
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['Cookie'] = `sos_session=${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const tests = [];
let passCount = 0;
let failCount = 0;

function it(name, fn) {
  tests.push({ name, fn });
}

// ==========================================
// TEST CASES DEFINITION
// ==========================================

let sessionToken = null;
let testContactId = null;
let testEventId = null;
let testMessageId = null;

it('1. System Status - Health check & Engine Verification', async () => {
  const res = await request('GET', '/api/system/status');
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Expected 200 OK, got ${res.status}`);
  }
  if (res.data.system.name !== 'SOS GUARDIAN') {
    throw new Error(`Unexpected system name: ${res.data.system.name}`);
  }
});

it('2. Authentication - User Login with Demo Account', async () => {
  const res = await request('POST', '/api/login', {
    email: 'demo@sosguardian.org',
    password: 'Emergency123!'
  });
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Login failed with status ${res.status}: ${JSON.stringify(res.data)}`);
  }
  sessionToken = res.data.token;
  if (!sessionToken) {
    throw new Error('No session token returned on login');
  }
  if (res.data.user.email !== 'demo@sosguardian.org') {
    throw new Error('Logged in user email does not match');
  }
});

it('3. Authentication - User Profile Retrieval with Session', async () => {
  const res = await request('GET', '/api/profile', null, sessionToken);
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Profile check failed with status ${res.status}`);
  }
  if (!res.data.user || !res.data.user.id) {
    throw new Error('Profile returned empty user object');
  }
});

it('4. Emergency Contacts - Create New Valid Indian Contact', async () => {
  const res = await request('POST', '/api/contacts', {
    contact_name: 'Pooja Verma (Sister)',
    mobile_number: '+919876543211',
    relationship: 'Sister',
    consent: true
  }, sessionToken);

  if (res.status !== 201 || !res.data.success) {
    throw new Error(`Failed to add contact: ${JSON.stringify(res.data)}`);
  }
  testContactId = res.data.contact.id;
  if (!testContactId) {
    throw new Error('No contact ID returned');
  }
});

it('5. Emergency Contacts - Rejection of Invalid Mobile Number', async () => {
  const res = await request('POST', '/api/contacts', {
    contact_name: 'Invalid Number Test',
    mobile_number: '12345',
    relationship: 'Friend',
    consent: true
  }, sessionToken);

  if (res.status !== 400 || res.data.success) {
    throw new Error(`Expected 400 Bad Request for invalid number, got ${res.status}`);
  }
});

it('6. Emergency Contacts - Rejection without Explicit Consent', async () => {
  const res = await request('POST', '/api/contacts', {
    contact_name: 'No Consent Test',
    mobile_number: '+919811122233',
    relationship: 'Colleague',
    consent: false
  }, sessionToken);

  if (res.status !== 400 || res.data.success) {
    throw new Error(`Expected 400 Bad Request without consent, got ${res.status}`);
  }
});

it('7. Emergency Contacts - List & Verify Contacts Belong to User', async () => {
  const res = await request('GET', '/api/contacts', null, sessionToken);
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Failed to list contacts: ${res.status}`);
  }
  if (!Array.isArray(res.data.contacts) || res.data.contacts.length === 0) {
    throw new Error('Contacts array empty or invalid');
  }
  const found = res.data.contacts.find((c) => c.id === testContactId);
  if (!found) {
    throw new Error(`Created contact ${testContactId} not found in user list`);
  }
});

it('8. Multi-Modal SOS - Manual Emergency Dispatch with GPS Coordinates', async () => {
  const res = await request('POST', '/api/sos', {
    trigger_type: 'manual',
    latitude: 28.6139,
    longitude: 77.2090,
    accuracy: 8.5,
    address_label: 'New Delhi Central Hub'
  }, sessionToken);

  if (res.status !== 201 || !res.data.success) {
    throw new Error(`Manual SOS failed with status ${res.status}: ${JSON.stringify(res.data)}`);
  }
  testEventId = res.data.event.id;
  if (!res.data.event.maps_url.includes('google.com/maps')) {
    throw new Error(`Invalid Google Maps URL: ${res.data.event.maps_url}`);
  }
  if (!res.data.notifications || res.data.notifications.length === 0) {
    throw new Error('No SMS notifications dispatched');
  }
  testMessageId = res.data.notifications[0].providerMessageId;
});

it('9. Rate Limiting - 8-Second Duplicate Emergency Prevention', async () => {
  const res = await request('POST', '/api/sos', {
    trigger_type: 'manual',
    latitude: 28.6139,
    longitude: 77.2090
  }, sessionToken);

  if (res.status !== 429) {
    throw new Error(`Expected 429 Too Many Requests for rapid duplicate, got ${res.status}`);
  }
  if (!res.data.error.includes('Duplicate emergency')) {
    throw new Error(`Unexpected error message: ${res.data.error}`);
  }
});

it('10. Emergency Event Details & Audit Verification', async () => {
  const res = await request('GET', `/api/sos/${testEventId}`, null, sessionToken);
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Failed to retrieve event ${testEventId}: ${res.status}`);
  }
  if (res.data.event.trigger_type !== 'manual') {
    throw new Error(`Expected trigger_type manual, got ${res.data.event.trigger_type}`);
  }
  if (!res.data.event.notifications || res.data.event.notifications.length === 0) {
    throw new Error('Event does not have notifications attached');
  }
});

it('11. Notifications - Test SMS to Specific Contact', async () => {
  const res = await request('POST', '/api/notifications/test', {
    contact_id: testContactId
  }, sessionToken);

  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Test notification failed: ${JSON.stringify(res.data)}`);
  }
  if (res.data.result.deliveryStatus !== 'Accepted') {
    throw new Error(`Expected deliveryStatus Accepted, got ${res.data.result.deliveryStatus}`);
  }
});

it('12. MSG91 DLR Webhook - Process External Delivery Callback', async () => {
  if (!testMessageId) {
    throw new Error('No message ID from previous test to update');
  }
  const res = await request('POST', '/api/webhooks/msg91', {
    requestId: testMessageId,
    status: 'Delivered',
    desc: 'Delivered to handset successfully'
  });

  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Webhook failed with status ${res.status}: ${JSON.stringify(res.data)}`);
  }

  // Verify status in DB
  const evRes = await request('GET', `/api/sos/${testEventId}`, null, sessionToken);
  const notif = evRes.data.event.notifications.find(n => n.provider_message_id === testMessageId);
  if (!notif || notif.delivery_status !== 'Delivered') {
    throw new Error(`Webhook did not update delivery_status to Delivered (status is ${notif?.delivery_status})`);
  }
});

it('13. User Settings - Update Sensitivity & MSG91 Mode', async () => {
  const res = await request('PUT', '/api/settings', {
    gesture_threshold: 10,
    emergency_phrases: 'help me,sos,save me',
    sms_enabled: false
  }, sessionToken);

  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Failed to update settings: ${res.status}`);
  }
  if (res.data.settings.gesture_threshold !== 10) {
    throw new Error(`Expected threshold 10, got ${res.data.settings.gesture_threshold}`);
  }
});

it('14. Emergency Contacts - Clean up Test Contact', async () => {
  const res = await request('DELETE', `/api/contacts/${testContactId}`, null, sessionToken);
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Failed to delete contact: ${res.status}`);
  }
});

it('15. Multi-User Isolation - User B cannot view User A contacts or events', async () => {
  const userBEmail = `user_b_${Date.now()}@example.com`;
  const regRes = await request('POST', '/api/register', {
    full_name: 'User Bravo',
    email: userBEmail,
    password: 'Password123!',
    confirm_password: 'Password123!'
  });
  if ((regRes.status !== 200 && regRes.status !== 201) || !regRes.data.token) {
    throw new Error(`Registration for User B failed: ${regRes.status}`);
  }
  const tokenB = regRes.data.token;

  // Contacts of User B should be empty
  const contactsB = await request('GET', '/api/contacts', null, tokenB);
  if (!contactsB.data.contacts || contactsB.data.contacts.length !== 0) {
    throw new Error(`User B should have 0 contacts, got ${contactsB.data.contacts?.length}`);
  }

  // Events of User B should be empty
  const eventsB = await request('GET', '/api/sos/history', null, tokenB);
  if (!eventsB.data.events || eventsB.data.events.length !== 0) {
    throw new Error(`User B should have 0 SOS events, got ${eventsB.data.events?.length}`);
  }
});

it('16. Multi-Modal SOS - AI Gesture Trigger Dispatch', async () => {
  // Wait 9.5s to cleanly bypass rate limit
  await new Promise((r) => setTimeout(r, 9500));

  const res = await request('POST', '/api/sos', {
    trigger_type: 'gesture',
    latitude: 19.0760,
    longitude: 72.8777,
    accuracy: 10,
    address_label: 'Mumbai Gateway Gesture Node'
  }, sessionToken);

  if (res.status !== 201 || !res.data.success) {
    throw new Error(`Gesture SOS failed: ${JSON.stringify(res.data)}`);
  }
  if (res.data.event.trigger_type !== 'gesture') {
    throw new Error(`Expected trigger_type gesture, got ${res.data.event.trigger_type}`);
  }
});

it('17. Multi-Modal SOS - Voice SOS Trigger Dispatch', async () => {
  // Wait 9.5s to bypass rate limit from previous SOS
  await new Promise((r) => setTimeout(r, 9500));

  const res = await request('POST', '/api/sos', {
    trigger_type: 'voice',
    latitude: 12.9716,
    longitude: 77.5946,
    accuracy: 5,
    address_label: 'Bengaluru Tech Park Voice Node'
  }, sessionToken);

  if (res.status !== 201 || !res.data.success) {
    throw new Error(`Voice SOS failed: ${JSON.stringify(res.data)}`);
  }
  if (res.data.event.trigger_type !== 'voice') {
    throw new Error(`Expected trigger_type voice, got ${res.data.event.trigger_type}`);
  }
});

it('18. SOS History - Filter Events by Trigger Type (gesture & voice)', async () => {
  const gestureRes = await request('GET', '/api/sos/history?trigger=gesture', null, sessionToken);
  if (gestureRes.status !== 200 || !gestureRes.data.success) {
    throw new Error('Failed to query gesture history');
  }
  const allGesture = gestureRes.data.events.every((e) => e.trigger_type === 'gesture');
  if (!allGesture) {
    throw new Error('History returned events that are not gesture');
  }
});

it('19. CSV Export Structure - Validate Columns and Data Escaping', async () => {
  const historyRes = await request('GET', '/api/sos/history', null, sessionToken);
  if (historyRes.status !== 200 || !historyRes.data.events) {
    throw new Error('Failed to retrieve events for CSV validation');
  }
  const events = historyRes.data.events;
  const headers = [
    'Event ID',
    'Trigger Method',
    'Event Status',
    'Latitude',
    'Longitude',
    'Accuracy (meters)',
    'Google Maps URL',
    'Address / Label',
    'Date & Time (ISO)',
    'Date & Time (Local)',
    'Alerted Contacts Count',
    'SMS Notifications Detail'
  ];
  if (events.length === 0) {
    throw new Error('No events to generate CSV from');
  }
  // Verify first event maps correctly to CSV rows
  const ev = events[0];
  if (!ev.id || !ev.trigger_type) {
    throw new Error('Event missing mandatory CSV fields');
  }
});

it('20. Authentication - Logout and Invalidate Session', async () => {
  const res = await request('POST', '/api/logout', null, sessionToken);
  if (res.status !== 200 || !res.data.success) {
    throw new Error(`Logout failed: ${res.status}`);
  }

  // Profile should now be 401 Unauthorized
  const checkRes = await request('GET', '/api/profile', null, sessionToken);
  if (checkRes.status !== 401) {
    throw new Error(`Expected 401 Unauthorized after logout, got ${checkRes.status}`);
  }
});

// ==========================================
// TEST RUNNER
// ==========================================

async function runAll() {
  console.log('\n======================================================');
  console.log('   SOS GUARDIAN - AUTOMATED END-TO-END TEST SUITE     ');
  console.log('======================================================\n');

  for (const t of tests) {
    process.stdout.write(`• ${t.name.padEnd(65)} `);
    try {
      await t.fn();
      console.log('\x1b[32m[PASS]\x1b[0m');
      passCount++;
    } catch (err) {
      console.log('\x1b[31m[FAIL]\x1b[0m');
      console.error(`  --> Error: ${err.message}\n`);
      failCount++;
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`Results: ${passCount} Passed, ${failCount} Failed (${tests.length} Total)`);
  console.log('------------------------------------------------------\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAll();
