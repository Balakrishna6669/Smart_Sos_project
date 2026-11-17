import React, { useState } from 'react';
import { Code, Terminal, FileText, Check, Copy, ArrowRight, Layers, Database, ShieldAlert, Cpu } from 'lucide-react';

const PYTHON_FILES: Record<string, { desc: string; code: string }> = {
  'app.py': {
    desc: 'Main Flask entrypoint with Blueprint registrations and database seeding',
    code: `"""
SOS GUARDIAN - Flask Backend Entrypoint
"""
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from models import db, User, EmergencyContact, UserSettings, SOSEvent, Notification
from routes import auth_bp, contacts_bp, sos_bp, notifications_bp, settings_bp, webhooks_bp

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='dist', static_url_path='/')
    app.config.from_object(config_class)
    CORS(app, supports_credentials=True)
    db.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(contacts_bp)
    app.register_blueprint(sos_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(webhooks_bp)

    with app.app_context():
        db.create_all()
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)`
  },
  'services/sms_service.py': {
    desc: 'MSG91 Flow SMS Integration with Indian DLT format and simulation fallback',
    code: `"""
MSG91 Flow SMS API Client
Documentation: https://docs.msg91.com/
"""
import os, re, json, time, requests
from datetime import datetime
from models import db, Notification

MSG91_FLOW_ENDPOINT = "https://control.msg91.com/api/v5/flow/"

def validate_mobile_number(mobile: str) -> str:
    cleaned = re.sub(r'[^0-9]', '', mobile)
    if len(cleaned) == 10:
        return '91' + cleaned
    return cleaned

def send_emergency_sms(recipients, user_name, trigger_type, location_url, event_id=None):
    auth_key = os.getenv('MSG91_AUTH_KEY', '')
    template_id = os.getenv('MSG91_TEMPLATE_ID', '')
    sms_enabled = os.getenv('SMS_ENABLED', 'false').lower() == 'true'
    # Dispatches to MSG91 Flow API or logs simulated delivery in test mode...`
  },
  'routes/sos.py': {
    desc: 'Central Emergency SOS route with 8-second duplicate protection and contact dispatch',
    code: `@sos_bp.route('', methods=['POST'])
def trigger_sos():
    user_id = session.get('user_id')
    data = request.get_json() or {}
    trigger_type = data.get('trigger_type') # manual | gesture | voice
    
    # 8-second duplicate prevention
    cutoff = datetime.utcnow() - timedelta(seconds=8)
    if SOSEvent.query.filter(SOSEvent.user_id == user_id, SOSEvent.created_at >= cutoff).first():
        return jsonify({'error': 'Duplicate emergency event prevented'}), 429
        
    # Saves event, acquires GPS, and alerts consented contacts via MSG91 Flow...`
  },
  'tests/test_sos.py': {
    desc: 'Comprehensive 18-step integration test suite covering Section 20 requirements',
    code: `import unittest
from app import create_app
from models import db

class SOSGuardianTestCase(unittest.TestCase):
    def test_01_registration(self): ...
    def test_07_manual_sos(self): ...
    def test_08_gesture_sos(self): ...
    def test_09_voice_sos(self): ...
    def test_10_duplicate_prevention(self): ...
    def test_12_msg91_webhook(self): ...`
  },
  'requirements.txt': {
    desc: 'Python dependencies for Flask, SQLAlchemy, Werkzeug, and Requests',
    code: `Flask==3.0.3
Flask-Cors==4.0.1
Flask-SQLAlchemy==3.1.1
Werkzeug==3.0.3
requests==2.32.3
python-dotenv==1.0.1
pytest==8.2.2`
  }
};

export const PythonProjectDocs: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('app.py');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(PYTHON_FILES[activeFile].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Architecture Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 pb-5 border-b border-slate-800 mb-6">
          <Layers className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Engineering Project Architecture</h2>
            <p className="text-xs text-slate-400">
              Multi-modal emergency processing pipeline and Python Flask backend architecture
            </p>
          </div>
        </div>

        {/* Workflow Diagram Box */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 overflow-x-auto text-xs font-mono text-slate-300">
          <div className="min-w-[680px] space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-blue-900/40 border border-blue-700/50 text-blue-300 font-bold">
                USER AUTHENTICATION (Session / SQLite)
              </span>
            </div>

            <div className="text-center text-slate-600">↓</div>

            <div className="flex items-center justify-center gap-4">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center flex-1">
                <span className="text-red-400 font-bold block">1. MANUAL SOS</span>
                <span className="text-[10px] text-slate-400">Large Red Button Click</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center flex-1">
                <span className="text-emerald-400 font-bold block">2. GESTURE SOS</span>
                <span className="text-[10px] text-slate-400">MediaPipe Open Palm (8 frames)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center flex-1">
                <span className="text-amber-400 font-bold block">3. VOICE SOS</span>
                <span className="text-[10px] text-slate-400">Web Speech API Phrases</span>
              </div>
            </div>

            <div className="text-center text-slate-600">↓ All 3 Triggers Connect</div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-center">
              <span className="text-white font-bold block">COMMON SOS ENGINE & 5-SECOND SAFETY COUNTDOWN</span>
              <span className="text-[10px] text-slate-400">Cancel Window (No accidental SMS on cancellation)</span>
            </div>

            <div className="text-center text-slate-600">↓ On Countdown 0 (Confirmed)</div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-emerald-400 font-bold block">GPS LOCATION CAPTURE</span>
                <span className="text-[10px] text-slate-400">Geolocation API → Google Maps URL</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="text-red-400 font-bold block">AUTOMATIC MSG91 FLOW SMS</span>
                <span className="text-[10px] text-slate-400">Approved DLT Template to Emergency Contacts</span>
              </div>
            </div>

            <div className="text-center text-slate-600">↓ Persistence & Delivery Status</div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 text-center">
              <span className="text-purple-300 font-bold block">SQLITE AUDIT LOG & SOS EVENT HISTORY</span>
              <span className="text-[10px] text-slate-400">Delivery Status tracking (Pending → Accepted → Delivered / Failed)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Python Code Browser */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Python Backend Codebase</h2>
              <p className="text-xs text-slate-400">
                Modular Python Flask, SQLAlchemy, and MSG91 service implementation files
              </p>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy File Content'}</span>
          </button>
        </div>

        {/* File selector tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(PYTHON_FILES).map((fname) => (
            <button
              key={fname}
              onClick={() => setActiveFile(fname)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                activeFile === fname
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {fname}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 mb-3 italic">
          {PYTHON_FILES[activeFile].desc}
        </p>

        {/* Code display block */}
        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto text-xs font-mono text-slate-200 max-h-[380px] leading-relaxed">
          <code>{PYTHON_FILES[activeFile].code}</code>
        </pre>
      </div>

      {/* Local Execution Instructions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 pb-5 border-b border-slate-800 mb-4">
          <Terminal className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Local Execution & Submission Guide</h2>
        </div>

        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-xs text-slate-300">
          <p className="font-semibold text-white">To run the Python Flask backend locally:</p>
          <div className="p-3 bg-slate-900 rounded-lg font-mono text-slate-200 space-y-1">
            <p>git clone &lt;repo&gt;</p>
            <p>pip install -r requirements.txt</p>
            <p>python app.py</p>
          </div>
          <p className="text-slate-400">
            The Flask REST server initializes the SQLite database at <code className="text-slate-200">instance/sos_guardian.db</code>, seeds default demo data, and serves the REST endpoints on port 5000.
          </p>
        </div>
      </div>
    </div>
  );
};
