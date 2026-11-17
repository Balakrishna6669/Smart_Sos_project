# SOS GUARDIAN
## Intelligent Multi-Modal Emergency Detection and Response System

SOS Guardian is an intelligent web-based personal emergency protection system engineered for high-reliability personal safety.

---

### Key Capabilities

1. **Multi-Modal Activation**:
   - **Manual SOS**: High-impact emergency button with tactile feedback and safety window.
   - **AI Hand Gesture Recognition**: Real-time MediaPipe Tasks Vision Hand Landmarker. Open-palm pose classification with multi-frame consistency filtering (8 frames) to prevent false positives. Runs 100% locally in the browser with zero video uploaded to servers.
   - **Voice-Based Emergency Detection**: Browser Web Speech API listening for emergency phrases (*"SOS"*, *"Help me"*, *"Emergency"*).
2. **Common SOS Engine**:
   - Unified countdown pipeline (`activateSOS('manual' | 'gesture' | 'voice')`).
   - 5-Second safety countdown window with instant cancel button and Web Audio synthesizer tones.
   - Protection against accidental duplicate dispatches (8-10 second cool-down).
3. **GPS Location Module**:
   - Browser Geolocation API with high-accuracy GPS coordinates.
   - Automatically generates standard Google Maps emergency URL: `https://www.google.com/maps?q=LAT,LNG`.
4. **Automatic MSG91 Flow SMS Integration**:
   - Official MSG91 Flow REST API (`https://control.msg91.com/api/v5/flow/`).
   - Compliant with Indian TRAI DLT registered templates and variable mapping (`user_name`, `trigger`, `time`, `location_url`).
   - Automated delivery status recording (`Pending`, `Accepted`, `Delivered`, `Failed`).
   - Delivery Report (DLR) webhook endpoint at `/api/webhooks/msg91`.
5. **Full-Stack Architecture**:
   - Node.js + Express + SQLite engine running the live interactive application.
   - Modular Python Flask + SQLAlchemy backend codebase included in `app.py`, `models/`, `routes/`, `services/`, and `tests/`.

---

### Folder Structure

```
SOS-GUARDIAN/
├── app.py                      # Flask backend entrypoint & DB initialization
├── config.py                   # Flask configuration & environment loader
├── requirements.txt            # Python dependencies (Flask, SQLAlchemy, requests)
├── server.ts                   # Full-stack Node/Express/SQLite dev & prod server
├── instance/
│   └── sos_guardian.db         # SQLite persistent database (WAL mode)
├── models/
│   ├── __init__.py             # SQLAlchemy instance export
│   ├── user.py                 # User model with salted password hashing
│   ├── contact.py              # Emergency contact model with consent flag
│   ├── sos.py                  # SOS event model with coordinates & status
│   ├── notification.py         # Notification model tracking MSG91 DLR
│   └── settings.py             # User detection settings & thresholds
├── routes/
│   ├── __init__.py
│   ├── auth.py                 # Registration, Login, Logout, Profile
│   ├── contacts.py             # Full CRUD for emergency contacts
│   ├── sos.py                  # SOS event creation & history
│   ├── notifications.py        # Test notification endpoint
│   ├── settings.py             # Configuration update
│   └── webhooks.py             # MSG91 DLR status callback webhook
├── services/
│   ├── __init__.py
│   └── sms_service.py          # MSG91 Flow API client & phone validation
├── tests/
│   └── test_sos.py             # 18-step integration test suite
├── src/
│   ├── types/                  # TypeScript interfaces
│   ├── services/
│   │   ├── api.ts              # REST API client
│   │   ├── audio.ts            # Web Audio API sound synthesizer
│   │   ├── emergency.ts        # Common SOS Engine
│   │   └── location.ts         # Geolocation GPS handler
│   ├── components/             # React UI Components
│   └── App.tsx                 # Main Application Container
└── .env.example                # Environment variables template
```

---

### MSG91 & Indian TRAI DLT Configuration

To send live SMS in India:
1. Register on an approved TRAI DLT portal (VilPower, Jio DLT, Airtel DLT) and obtain a **Principal Entity ID**.
2. Register an approved 6-character **Sender Header** (e.g., `SOSGRD`) under *Service Implicit*.
3. Register the Content Template:
   ```
   SOS GUARDIAN - EMERGENCY ALERT: An emergency has been activated by {#var#}. Trigger: {#var#}. Time: {#var#}. Location: {#var#}. Please respond immediately.
   ```
4. Set credentials in `.env`:
   ```bash
   MSG91_AUTH_KEY="your_msg91_authkey"
   MSG91_TEMPLATE_ID="your_approved_flow_template_id"
   SMS_ENABLED=true
   ```

*When `SMS_ENABLED=false` or no credentials are set, the system safely operates in simulation/test mode, recording full mock responses without sending unintended real SMS.*

---

### Running the Python Backend

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run automated tests
python -m unittest tests/test_sos.py

# 3. Start Flask server
python app.py
```
