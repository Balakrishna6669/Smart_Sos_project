"""
SOS GUARDIAN – INTELLIGENT MULTI-MODAL EMERGENCY DETECTION AND RESPONSE SYSTEM
Python Flask Backend Application Entrypoint
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from models import db, User, EmergencyContact, UserSettings, SOSEvent, Notification
from routes import auth_bp, contacts_bp, sos_bp, notifications_bp, settings_bp, webhooks_bp

def create_app(config_class=Config):
    app = Flask(__name__, static_folder='dist', static_url_path='/')
    app.config.from_object(config_class)

    # Enable CORS for frontend API integration
    CORS(app, supports_credentials=True)

    # Initialize Database
    db.init_app(app)

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(contacts_bp)
    app.register_blueprint(sos_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(webhooks_bp)

    @app.route('/api/system/status')
    def system_status():
        auth_key = bool(app.config.get('MSG91_AUTH_KEY'))
        template_id = bool(app.config.get('MSG91_TEMPLATE_ID'))
        sms_enabled = app.config.get('SMS_ENABLED', False)

        return jsonify({
            'success': True,
            'system': {
                'name': 'SOS GUARDIAN (Flask Backend)',
                'version': '1.0.0-PROD',
                'database': 'SQLite / SQLAlchemy',
                'sms_provider': 'MSG91 Flow API v5',
                'sms_configured': auth_key and template_id,
                'sms_enabled': sms_enabled,
                'stats': {
                    'users': User.query.count(),
                    'sos_events': SOSEvent.query.count(),
                    'notifications': Notification.query.count()
                }
            }
        })

    # Serve built frontend if exists
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        elif os.path.exists(os.path.join(app.static_folder, 'index.html')):
            return send_from_directory(app.static_folder, 'index.html')
        return jsonify({
            'service': 'SOS GUARDIAN Backend API',
            'status': 'Online',
            'api_endpoints': ['/api/register', '/api/login', '/api/contacts', '/api/sos', '/api/settings']
        })

    with app.app_context():
        # Ensure instance directory exists
        os.makedirs(os.path.join(app.root_path, 'instance'), exist_ok=True)
        db.create_all()

        # Seed initial demo account if empty
        if User.query.count() == 0:
            demo_user = User(
                full_name='Dr. Alex Sharma',
                email='demo@sosguardian.org',
                medical_notes='Asthmatic, carries rescue inhaler',
                blood_group='O+'
            )
            demo_user.set_password('Emergency123!')
            db.session.add(demo_user)
            db.session.flush()

            # Seed contacts
            c1 = EmergencyContact(user_id=demo_user.id, contact_name='Priya Sharma (Spouse)', mobile_number='+919876543210', relationship='Spouse', consent=1)
            c2 = EmergencyContact(user_id=demo_user.id, contact_name='Rajesh Kumar (Brother)', mobile_number='+919812345678', relationship='Brother', consent=1)
            c3 = EmergencyContact(user_id=demo_user.id, contact_name='Dr. Mehta (Personal Physician)', mobile_number='+919823456789', relationship='Doctor', consent=1)
            db.session.add_all([c1, c2, c3])

            # Seed settings
            st = UserSettings(user_id=demo_user.id, gesture_enabled=1, voice_enabled=1, location_enabled=1)
            db.session.add(st)
            db.session.commit()

    return app

if __name__ == '__main__':
    application = create_app()
    port = int(os.environ.get('PORT', 5000))
    print(f"SOS GUARDIAN Flask Backend running on http://127.0.0.1:{port}")
    application.run(host='0.0.0.0', port=port, debug=True)
