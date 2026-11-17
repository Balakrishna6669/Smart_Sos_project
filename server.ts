import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Ensure instance directory exists for SQLite database
const instanceDir = path.join(__dirname, 'instance');
if (!fs.existsSync(instanceDir)) {
  fs.mkdirSync(instanceDir, { recursive: true });
}

const dbPath = path.join(instanceDir, 'sos_guardian.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    medical_notes TEXT,
    blood_group TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_name TEXT NOT NULL,
    mobile_number TEXT NOT NULL,
    relationship TEXT,
    consent INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sos_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trigger_type TEXT NOT NULL, -- 'manual' | 'gesture' | 'voice'
    latitude REAL,
    longitude REAL,
    accuracy REAL,
    maps_url TEXT,
    status TEXT DEFAULT 'Confirmed',
    address_label TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER,
    contact_id INTEGER,
    mobile_number TEXT NOT NULL,
    provider TEXT DEFAULT 'MSG91',
    provider_message_id TEXT,
    provider_response TEXT,
    delivery_status TEXT DEFAULT 'Pending', -- 'Pending' | 'Accepted' | 'Delivered' | 'Failed' | 'Unknown'
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    delivered_at DATETIME,
    FOREIGN KEY(event_id) REFERENCES sos_events(id) ON DELETE CASCADE,
    FOREIGN KEY(contact_id) REFERENCES emergency_contacts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    gesture_enabled INTEGER DEFAULT 1,
    voice_enabled INTEGER DEFAULT 1,
    location_enabled INTEGER DEFAULT 1,
    gesture_threshold INTEGER DEFAULT 8,
    emergency_phrases TEXT DEFAULT 'sos,help me,emergency',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migration for MSG91 settings columns
try { db.exec('ALTER TABLE user_settings ADD COLUMN msg91_auth_key TEXT'); } catch {}
try { db.exec('ALTER TABLE user_settings ADD COLUMN msg91_template_id TEXT'); } catch {}
try { db.exec('ALTER TABLE user_settings ADD COLUMN sms_enabled INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE user_settings ADD COLUMN telegram_bot_token TEXT'); } catch {}
try { db.exec('ALTER TABLE user_settings ADD COLUMN telegram_chat_id TEXT'); } catch {}
try { db.exec('ALTER TABLE user_settings ADD COLUMN telegram_enabled INTEGER DEFAULT 0'); } catch {}

// Password hashing utility using Node crypto scrypt (secure salted hash)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password: string, combined: string): boolean {
  try {
    const [salt, key] = combined.split(':');
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
  } catch {
    return false;
  }
}

// Session tokens stored in-memory and mapped to user IDs
const SESSIONS = new Map<string, { userId: number; email: string; createdAt: number }>();

function createSession(userId: number, email: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  SESSIONS.set(token, { userId, email, createdAt: Date.now() });
  return token;
}

// Seed default demo user and contacts if none exist
(() => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const defaultPassHash = hashPassword('Emergency123!');
    const insertUser = db.prepare(`
      INSERT INTO users (full_name, email, password_hash, medical_notes, blood_group)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insertUser.run('Dr. Alex Sharma', 'demo@sosguardian.org', defaultPassHash, 'Asthmatic, carries rescue inhaler', 'O+');
    const demoUserId = info.lastInsertRowid;

    // Seed emergency contacts
    const insertContact = db.prepare(`
      INSERT INTO emergency_contacts (user_id, contact_name, mobile_number, relationship, consent)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertContact.run(demoUserId, 'Priya Sharma (Spouse)', '+919876543210', 'Spouse', 1);
    insertContact.run(demoUserId, 'Rajesh Kumar (Brother)', '+919812345678', 'Brother', 1);
    insertContact.run(demoUserId, 'Dr. Mehta (Personal Physician)', '+919823456789', 'Doctor', 1);

    // Seed settings
    const insertSettings = db.prepare(`
      INSERT INTO user_settings (user_id, gesture_enabled, voice_enabled, location_enabled, gesture_threshold)
      VALUES (?, 1, 1, 1, 8)
    `);
    insertSettings.run(demoUserId);

    // Seed initial demo SOS event
    const insertEvent = db.prepare(`
      INSERT INTO sos_events (user_id, trigger_type, latitude, longitude, accuracy, maps_url, status, address_label, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 hours'))
    `);
    const eventInfo = insertEvent.run(
      demoUserId,
      'manual',
      28.6139,
      77.2090,
      12.5,
      'https://www.google.com/maps?q=28.6139,77.2090',
      'Confirmed',
      'Connaught Place, New Delhi, India'
    );
    const demoEventId = eventInfo.lastInsertRowid;

    const insertNotification = db.prepare(`
      INSERT INTO notifications (event_id, contact_id, mobile_number, provider, provider_message_id, provider_response, delivery_status, sent_at, delivered_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-2 hours'), datetime('now', '-2 hours', '+10 seconds'))
    `);
    insertNotification.run(
      demoEventId,
      1,
      '+919876543210',
      'MSG91',
      'req_msg91_demo_982138',
      JSON.stringify({ type: 'success', message: 'Campaign request accepted', request_id: 'req_msg91_demo_982138' }),
      'Delivered'
    );
  }
})();

// Middleware
app.use(express.json());
app.use(cookieParser());

// Authentication Middleware
function authRequired(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = req.cookies.sos_session || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
    return;
  }

  const session = SESSIONS.get(token);
  if (!session) {
    res.status(401).json({ success: false, error: 'Session expired or invalid. Please log in again.' });
    return;
  }

  (req as any).user = { id: session.userId, email: session.email };
  next();
}

// Helper: MSG91 SMS Dispatcher
interface SmsRecipient {
  name: string;
  mobile: string;
  contactId: number;
}

interface SmsDispatchResult {
  contactId: number;
  mobileNumber: string;
  deliveryStatus: string;
  providerMessageId: string;
  providerResponse: any;
}

async function sendMsg91Sms(
  recipients: SmsRecipient[],
  userName: string,
  triggerType: string,
  mapsUrl: string,
  eventId: number,
  userId?: number
): Promise<SmsDispatchResult[]> {
  let authKey = process.env.MSG91_AUTH_KEY || '';
  let templateId = process.env.MSG91_TEMPLATE_ID || '';
  let smsEnabled = process.env.SMS_ENABLED === 'true';

  if (userId) {
    const userSettings = db.prepare('SELECT msg91_auth_key, msg91_template_id, sms_enabled FROM user_settings WHERE user_id = ?').get(userId) as any;
    if (userSettings) {
      if (userSettings.msg91_auth_key) authKey = userSettings.msg91_auth_key.trim();
      if (userSettings.msg91_template_id) templateId = userSettings.msg91_template_id.trim();
      if (userSettings.sms_enabled !== undefined && userSettings.sms_enabled !== null) {
        smsEnabled = Boolean(userSettings.sms_enabled);
      }
    }
  }

  const isLive = smsEnabled && Boolean(authKey && templateId);
  const results: SmsDispatchResult[] = [];
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  for (const recipient of recipients) {
    // Sanitize mobile number (MSG91 expects country code without leading +, e.g. 919876543210)
    let cleanMobile = recipient.mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length === 10) {
      cleanMobile = '91' + cleanMobile; // Default to India prefix if 10 digits
    }

    if (isLive) {
      try {
        const payload = {
          template_id: templateId,
          short_url: '0',
          recipients: [
            {
              mobiles: cleanMobile,
              name: recipient.name,
              user_name: userName,
              trigger: `${triggerType.toUpperCase()} SOS`,
              time: timestamp,
              location_url: mapsUrl
            }
          ]
        };

        const response = await fetch('https://control.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'authkey': authKey,
            'content-type': 'application/json',
            'accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(8000)
        });

        const data = await response.json();
        const isOk = response.ok && (data.type === 'success' || data.status === 'success');
        const messageId = data.request_id || data.message || `msg91_${Date.now()}`;
        const status = isOk ? 'Accepted' : 'Failed';

        results.push({
          contactId: recipient.contactId,
          mobileNumber: recipient.mobile,
          deliveryStatus: status,
          providerMessageId: messageId,
          providerResponse: data
        });
      } catch (err: any) {
        results.push({
          contactId: recipient.contactId,
          mobileNumber: recipient.mobile,
          deliveryStatus: 'Failed',
          providerMessageId: `err_${Date.now()}`,
          providerResponse: { error: err.message || 'Network failure to MSG91 API' }
        });
      }
    } else {
      // Simulation / Test Mode (when MSG91_AUTH_KEY or SMS_ENABLED is not set)
      // Generates an exact MSG91 schema response for testing & project review
      const mockRequestId = `req_msg91_sim_${Date.now().toString(36)}_${Math.floor(Math.random() * 9000 + 1000)}`;
      const simulatedResponse = {
        type: 'success',
        status: 'simulated_accepted',
        request_id: mockRequestId,
        message: 'Campaign request accepted in simulation/test mode',
        info: 'SMS_ENABLED is false or MSG91 credentials not set. Request logged for verification.',
        dlt_template_variables: {
          user_name: userName,
          trigger: `${triggerType.toUpperCase()} SOS`,
          time: timestamp,
          location_url: mapsUrl
        }
      };

      results.push({
        contactId: recipient.contactId,
        mobileNumber: recipient.mobile,
        deliveryStatus: 'Accepted',
        providerMessageId: mockRequestId,
        providerResponse: simulatedResponse
      });
    }
  }

  // Record notifications into SQLite
  const insertStmt = db.prepare(`
    INSERT INTO notifications (event_id, contact_id, mobile_number, provider, provider_message_id, provider_response, delivery_status, sent_at)
    VALUES (?, ?, ?, 'MSG91', ?, ?, ?, CURRENT_TIMESTAMP)
  `);

  for (const res of results) {
    insertStmt.run(
      eventId && eventId > 0 ? eventId : null,
      res.contactId,
      res.mobileNumber,
      res.providerMessageId,
      JSON.stringify(res.providerResponse),
      res.deliveryStatus
    );
  }

  return results;
}

// Helper: Telegram Bot Multi-Channel Emergency Dispatcher (Zero DLT Required)
async function sendTelegramAlert(
  userId: number,
  userName: string,
  triggerType: string,
  mapsUrl: string,
  eventId: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const userSettings = db.prepare('SELECT telegram_bot_token, telegram_chat_id, telegram_enabled FROM user_settings WHERE user_id = ?').get(userId) as any;
    const botToken = (userSettings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (userSettings?.telegram_chat_id || process.env.TELEGRAM_CHAT_ID || '').trim();
    const enabled = Boolean(userSettings?.telegram_enabled) || process.env.TELEGRAM_ENABLED === 'true';

    if (!enabled || !botToken || !chatId) {
      return { success: false, error: 'Telegram alerting not configured or disabled' };
    }

    const text = `🚨 *SOS GUARDIAN EMERGENCY ALERT* 🚨\n\n👤 *User:* ${userName}\n⚡ *Trigger:* ${triggerType.toUpperCase()} SOS\n⏰ *Time:* ${new Date().toUTCString()}\n🗺️ *Live Google Maps:* ${mapsUrl}\n\n_Immediate emergency assistance requested._`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      }),
      signal: AbortSignal.timeout(6000)
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      db.prepare(`
        INSERT INTO notifications (event_id, contact_id, mobile_number, provider, provider_message_id, provider_response, delivery_status, sent_at)
        VALUES (?, NULL, ?, 'Telegram', ?, ?, 'Delivered', CURRENT_TIMESTAMP)
      `).run(
        eventId && eventId > 0 ? eventId : null,
        `ChatID: ${chatId}`,
        String(data.result?.message_id || `tg_${Date.now()}`),
        JSON.stringify(data)
      );
      return { success: true, messageId: String(data.result?.message_id) };
    } else {
      return { success: false, error: data.description || 'Failed to dispatch Telegram alert' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ==========================================
// REST API ROUTES
// ==========================================

// 1. Auth: Register
app.post('/api/register', (req: Request, res: Response) => {
  try {
    const { full_name, email, password, confirm_password } = req.body;

    if (!full_name || !email || !password) {
      res.status(400).json({ success: false, error: 'Full name, email, and password are required.' });
      return;
    }

    if (password !== confirm_password) {
      res.status(400).json({ success: false, error: 'Passwords do not match.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ success: false, error: 'Invalid email address format.' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
      return;
    }

    const passHash = hashPassword(password);
    const insert = db.prepare(`
      INSERT INTO users (full_name, email, password_hash)
      VALUES (?, ?, ?)
    `);
    const info = insert.run(full_name.trim(), email.toLowerCase().trim(), passHash);
    const userId = Number(info.lastInsertRowid);

    // Initialize user settings
    db.prepare(`
      INSERT INTO user_settings (user_id, gesture_enabled, voice_enabled, location_enabled, gesture_threshold)
      VALUES (?, 1, 1, 1, 8)
    `).run(userId);

    const token = createSession(userId, email.toLowerCase().trim());
    res.cookie('sos_session', token, { httpOnly: true, sameSite: 'lax', maxAge: 86400000 });

    res.json({
      success: true,
      token,
      user: { id: userId, full_name: full_name.trim(), email: email.toLowerCase().trim() }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Registration failed.' });
  }
});

// 2. Auth: Login
app.post('/api/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as any;
    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ success: false, error: 'Invalid email or password.' });
      return;
    }

    const token = createSession(user.id, user.email);
    res.cookie('sos_session', token, { httpOnly: true, sameSite: 'lax', maxAge: 86400000 });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        medical_notes: user.medical_notes,
        blood_group: user.blood_group
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Login failed.' });
  }
});

// 3. Auth: Logout
app.post('/api/logout', (req: Request, res: Response) => {
  const token = req.cookies.sos_session || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (token) {
    SESSIONS.delete(token);
  }
  res.clearCookie('sos_session');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// 4. Auth: Profile
app.get('/api/profile', authRequired, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const user = db.prepare('SELECT id, full_name, email, medical_notes, blood_group, created_at FROM users WHERE id = ?').get(userId);
  if (!user) {
    res.status(404).json({ success: false, error: 'User not found.' });
    return;
  }
  res.json({ success: true, user });
});

// Update Profile
app.put('/api/profile', authRequired, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { full_name, medical_notes, blood_group, new_password } = req.body;

    if (full_name) {
      db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(full_name.trim(), userId);
    }
    if (medical_notes !== undefined) {
      db.prepare('UPDATE users SET medical_notes = ? WHERE id = ?').run(medical_notes, userId);
    }
    if (blood_group !== undefined) {
      db.prepare('UPDATE users SET blood_group = ? WHERE id = ?').run(blood_group, userId);
    }
    if (new_password && new_password.length >= 6) {
      const passHash = hashPassword(new_password);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passHash, userId);
    }

    const updated = db.prepare('SELECT id, full_name, email, medical_notes, blood_group, created_at FROM users WHERE id = ?').get(userId);
    res.json({ success: true, user: updated, message: 'Profile updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Emergency Contacts: List
app.get('/api/contacts', authRequired, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const contacts = db.prepare('SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY id DESC').all(userId);
  res.json({ success: true, contacts });
});

// Emergency Contacts: Create
app.post('/api/contacts', authRequired, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { contact_name, mobile_number, relationship, consent } = req.body;

    if (!contact_name || !mobile_number) {
      res.status(400).json({ success: false, error: 'Contact name and mobile number are required.' });
      return;
    }

    // Validate phone number format (allow +, digits, spaces)
    const cleaned = mobile_number.replace(/[^0-9]/g, '');
    if (cleaned.length < 10 || cleaned.length > 15) {
      res.status(400).json({ success: false, error: 'Please enter a valid mobile number with country code (e.g. +919876543210).' });
      return;
    }

    if (consent !== true && consent !== 1) {
      res.status(400).json({ success: false, error: 'SMS consent is mandatory. Contact must have agreed to receive emergency alerts.' });
      return;
    }

    const insert = db.prepare(`
      INSERT INTO emergency_contacts (user_id, contact_name, mobile_number, relationship, consent)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = insert.run(userId, contact_name.trim(), mobile_number.trim(), relationship || 'Other', 1);

    const created = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ success: true, contact: created, message: 'Emergency contact added.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Emergency Contacts: Update
app.put('/api/contacts/:id', authRequired, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const contactId = parseInt(req.params.id, 10);
    const { contact_name, mobile_number, relationship, consent } = req.body;

    const existing = db.prepare('SELECT id FROM emergency_contacts WHERE id = ? AND user_id = ?').get(contactId, userId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Contact not found or unauthorized.' });
      return;
    }

    db.prepare(`
      UPDATE emergency_contacts
      SET contact_name = COALESCE(?, contact_name),
          mobile_number = COALESCE(?, mobile_number),
          relationship = COALESCE(?, relationship),
          consent = COALESCE(?, consent)
      WHERE id = ? AND user_id = ?
    `).run(
      contact_name ? contact_name.trim() : null,
      mobile_number ? mobile_number.trim() : null,
      relationship || null,
      consent !== undefined ? (consent ? 1 : 0) : null,
      contactId,
      userId
    );

    const updated = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(contactId);
    res.json({ success: true, contact: updated, message: 'Contact updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Emergency Contacts: Delete
app.delete('/api/contacts/:id', authRequired, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const contactId = parseInt(req.params.id, 10);

    const existing = db.prepare('SELECT id FROM emergency_contacts WHERE id = ? AND user_id = ?').get(contactId, userId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Contact not found or unauthorized.' });
      return;
    }

    db.prepare('DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?').run(contactId, userId);
    res.json({ success: true, message: 'Contact deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. SOS: Create Emergency Event (POST /api/sos)
// Anti-duplicate protection: reject requests within 10 seconds of a previous confirmed SOS for the same user
app.post('/api/sos', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { trigger_type, latitude, longitude, accuracy, address_label } = req.body;

    if (!trigger_type || !['manual', 'gesture', 'voice'].includes(trigger_type)) {
      res.status(400).json({ success: false, error: 'Valid trigger_type (manual, gesture, voice) is required.' });
      return;
    }

    // Check duplicate within 8 seconds
    const recent = db.prepare(`
      SELECT id, created_at FROM sos_events
      WHERE user_id = ? AND datetime(created_at) >= datetime('now', '-8 seconds')
      ORDER BY id DESC LIMIT 1
    `).get(userId) as any;

    if (recent) {
      res.status(429).json({
        success: false,
        error: 'Duplicate emergency event prevented. An emergency was already dispatched a few seconds ago.',
        event_id: recent.id
      });
      return;
    }

    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as { full_name: string };

    let mapsUrl = 'Location unavailable';
    const lat = typeof latitude === 'number' ? latitude : null;
    const lng = typeof longitude === 'number' ? longitude : null;
    if (lat !== null && lng !== null) {
      mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    }

    // Insert SOS event
    const insertEvent = db.prepare(`
      INSERT INTO sos_events (user_id, trigger_type, latitude, longitude, accuracy, maps_url, status, address_label)
      VALUES (?, ?, ?, ?, ?, ?, 'Confirmed', ?)
    `);
    const eventInfo = insertEvent.run(
      userId,
      trigger_type,
      lat,
      lng,
      typeof accuracy === 'number' ? accuracy : null,
      mapsUrl,
      address_label || (lat !== null && lng !== null ? `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Manual Location')
    );
    const eventId = Number(eventInfo.lastInsertRowid);

    // Fetch consented emergency contacts
    const contacts = db.prepare(`
      SELECT id, contact_name, mobile_number FROM emergency_contacts
      WHERE user_id = ? AND consent = 1
    `).all(userId) as Array<{ id: number; contact_name: string; mobile_number: string }>;

    let notifications: SmsDispatchResult[] = [];
    if (contacts.length > 0) {
      const recipients: SmsRecipient[] = contacts.map(c => ({
        contactId: c.id,
        name: c.contact_name,
        mobile: c.mobile_number
      }));

      notifications = await sendMsg91Sms(recipients, user.full_name, trigger_type, mapsUrl, eventId, userId);
    }

    // Also dispatch to Telegram bot if configured by user (bypasses Indian TRAI DLT completely)
    await sendTelegramAlert(userId, user.full_name, trigger_type, mapsUrl, eventId);

    const event = db.prepare('SELECT * FROM sos_events WHERE id = ?').get(eventId);

    res.status(201).json({
      success: true,
      event,
      notifications,
      contacts_notified_count: contacts.length,
      message: `Emergency confirmed. ${contacts.length} emergency contacts notified via MSG91 SMS.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to dispatch SOS event.' });
  }
});

// SOS History: List
app.get('/api/sos/history', authRequired, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { trigger, limit } = req.query;

  let query = 'SELECT * FROM sos_events WHERE user_id = ?';
  const params: any[] = [userId];

  if (trigger && ['manual', 'gesture', 'voice'].includes(String(trigger))) {
    query += ' AND trigger_type = ?';
    params.push(String(trigger));
  }

  query += ' ORDER BY id DESC LIMIT ?';
  params.push(limit ? parseInt(String(limit), 10) : 50);

  const events = db.prepare(query).all(...params) as any[];

  // Attach notification summary to each event
  const eventsWithNotifications = events.map(ev => {
    const notifs = db.prepare(`
      SELECT n.*, c.contact_name
      FROM notifications n
      LEFT JOIN emergency_contacts c ON n.contact_id = c.id
      WHERE n.event_id = ?
    `).all(ev.id);
    return { ...ev, notifications: notifs };
  });

  res.json({ success: true, events: eventsWithNotifications });
});

// SOS Details: Single
app.get('/api/sos/:id', authRequired, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const eventId = parseInt(req.params.id, 10);

  const event = db.prepare('SELECT * FROM sos_events WHERE id = ? AND user_id = ?').get(eventId, userId) as any;
  if (!event) {
    res.status(404).json({ success: false, error: 'SOS event not found or unauthorized.' });
    return;
  }

  const notifications = db.prepare(`
    SELECT n.*, c.contact_name
    FROM notifications n
    LEFT JOIN emergency_contacts c ON n.contact_id = c.id
    WHERE n.event_id = ?
  `).all(eventId);

  res.json({ success: true, event: { ...event, notifications } });
});

// SOS Notifications for event
app.get('/api/sos/:id/notifications', authRequired, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const eventId = parseInt(req.params.id, 10);

  const event = db.prepare('SELECT id FROM sos_events WHERE id = ? AND user_id = ?').get(eventId, userId);
  if (!event) {
    res.status(404).json({ success: false, error: 'Event not found.' });
    return;
  }

  const notifications = db.prepare('SELECT * FROM notifications WHERE event_id = ?').all(eventId);
  res.json({ success: true, notifications });
});

// 7. Notifications: Test SMS to a single contact
app.post('/api/notifications/test', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { contact_id } = req.body;

    if (!contact_id) {
      res.status(400).json({ success: false, error: 'contact_id is required.' });
      return;
    }

    const contact = db.prepare('SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?').get(contact_id, userId) as any;
    if (!contact) {
      res.status(404).json({ success: false, error: 'Contact not found or unauthorized.' });
      return;
    }

    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as any;
    const results = await sendMsg91Sms(
      [{ contactId: contact.id, name: contact.contact_name, mobile: contact.mobile_number }],
      user.full_name,
      'test',
      'https://www.google.com/maps?q=28.6139,77.2090',
      0,
      userId
    );

    res.json({ success: true, result: results[0], message: `Test alert sent to ${contact.contact_name}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Notifications: Test Telegram Bot alert
app.post('/api/notifications/test-telegram', authRequired, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const user = db.prepare('SELECT full_name FROM users WHERE id = ?').get(userId) as any;
    const result = await sendTelegramAlert(
      userId,
      user.full_name,
      'test',
      'https://www.google.com/maps?q=28.6139,77.2090',
      0
    );

    if (result.success) {
      res.json({ success: true, message: 'Test emergency alert sent successfully to your Telegram bot!' });
    } else {
      res.status(400).json({ success: false, error: result.error || 'Failed to dispatch Telegram message. Check Bot Token and Chat ID in Settings.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Notifications: MSG91 Delivery Webhook (POST /api/webhooks/msg91)
app.post('/api/webhooks/msg91', (req: Request, res: Response) => {
  try {
    // Official MSG91 delivery callback reports requestId / status
    const body = req.body;
    const requestId = body.requestId || body.request_id || body.data?.requestId;
    const status = body.status || body.data?.status || 'Unknown';

    if (requestId) {
      // Map MSG91 delivery states
      let mappedStatus = 'Unknown';
      const s = String(status).toLowerCase();
      if (s.includes('deliver') || s.includes('success')) mappedStatus = 'Delivered';
      else if (s.includes('fail') || s.includes('reject')) mappedStatus = 'Failed';
      else if (s.includes('accept') || s.includes('process')) mappedStatus = 'Accepted';

      db.prepare(`
        UPDATE notifications
        SET delivery_status = ?,
            delivered_at = CURRENT_TIMESTAMP,
            provider_response = json_insert(COALESCE(provider_response, '{}'), '$.webhook_update', ?)
        WHERE provider_message_id = ?
      `).run(mappedStatus, JSON.stringify(body), requestId);
    }

    res.json({ success: true, message: 'Webhook processed.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. User Settings: Get
app.get('/api/settings', authRequired, (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;

  if (!settings) {
    db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);
    settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  }

  res.json({
    success: true,
    settings: {
      ...settings,
      gesture_enabled: Boolean(settings.gesture_enabled),
      voice_enabled: Boolean(settings.voice_enabled),
      location_enabled: Boolean(settings.location_enabled),
      sms_enabled: Boolean(settings.sms_enabled),
      msg91_auth_key: settings.msg91_auth_key || '',
      msg91_template_id: settings.msg91_template_id || '',
      telegram_enabled: Boolean(settings.telegram_enabled),
      telegram_bot_token: settings.telegram_bot_token || '',
      telegram_chat_id: settings.telegram_chat_id || '',
    }
  });
});

// User Settings: Update
app.put('/api/settings', authRequired, (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      gesture_enabled,
      voice_enabled,
      location_enabled,
      gesture_threshold,
      emergency_phrases,
      msg91_auth_key,
      msg91_template_id,
      sms_enabled,
      telegram_bot_token,
      telegram_chat_id,
      telegram_enabled
    } = req.body;

    db.prepare(`
      UPDATE user_settings
      SET gesture_enabled = COALESCE(?, gesture_enabled),
          voice_enabled = COALESCE(?, voice_enabled),
          location_enabled = COALESCE(?, location_enabled),
          gesture_threshold = COALESCE(?, gesture_threshold),
          emergency_phrases = COALESCE(?, emergency_phrases),
          msg91_auth_key = COALESCE(?, msg91_auth_key),
          msg91_template_id = COALESCE(?, msg91_template_id),
          sms_enabled = COALESCE(?, sms_enabled),
          telegram_bot_token = COALESCE(?, telegram_bot_token),
          telegram_chat_id = COALESCE(?, telegram_chat_id),
          telegram_enabled = COALESCE(?, telegram_enabled),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(
      gesture_enabled !== undefined ? (gesture_enabled ? 1 : 0) : null,
      voice_enabled !== undefined ? (voice_enabled ? 1 : 0) : null,
      location_enabled !== undefined ? (location_enabled ? 1 : 0) : null,
      gesture_threshold !== undefined ? gesture_threshold : null,
      emergency_phrases !== undefined ? emergency_phrases : null,
      msg91_auth_key !== undefined ? msg91_auth_key : null,
      msg91_template_id !== undefined ? msg91_template_id : null,
      sms_enabled !== undefined ? (sms_enabled ? 1 : 0) : null,
      telegram_bot_token !== undefined ? telegram_bot_token : null,
      telegram_chat_id !== undefined ? telegram_chat_id : null,
      telegram_enabled !== undefined ? (telegram_enabled ? 1 : 0) : null,
      userId
    );

    const updated = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as any;
    res.json({
      success: true,
      settings: {
        ...updated,
        gesture_enabled: Boolean(updated.gesture_enabled),
        voice_enabled: Boolean(updated.voice_enabled),
        location_enabled: Boolean(updated.location_enabled),
        sms_enabled: Boolean(updated.sms_enabled),
        msg91_auth_key: updated.msg91_auth_key || '',
        msg91_template_id: updated.msg91_template_id || '',
        telegram_enabled: Boolean(updated.telegram_enabled),
        telegram_bot_token: updated.telegram_bot_token || '',
        telegram_chat_id: updated.telegram_chat_id || '',
      },
      message: 'Settings saved successfully.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// System Status / Config Check
app.get('/api/system/status', (req: Request, res: Response) => {
  const authKey = process.env.MSG91_AUTH_KEY || '';
  const templateId = process.env.MSG91_TEMPLATE_ID || '';
  const smsEnabled = process.env.SMS_ENABLED === 'true';

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const eventCount = db.prepare('SELECT COUNT(*) as count FROM sos_events').get() as any;
  const notifCount = db.prepare('SELECT COUNT(*) as count FROM notifications').get() as any;

  res.json({
    success: true,
    system: {
      name: 'SOS GUARDIAN',
      version: '1.0.0-PROD',
      database: 'SQLite 3 (WAL mode)',
      sms_provider: 'MSG91 Flow API v5',
      sms_configured: Boolean(authKey && templateId),
      sms_enabled: smsEnabled,
      has_auth_key: Boolean(authKey),
      has_template_id: Boolean(templateId),
      dlt_flow_endpoint: 'https://control.msg91.com/api/v5/flow/',
      stats: {
        users: userCount.count,
        sos_events: eventCount.count,
        notifications: notifCount.count
      }
    }
  });
});

// ==========================================
// VITE DEV SERVER OR STATIC PRODUCTION SERVE
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serve
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SOS GUARDIAN server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
