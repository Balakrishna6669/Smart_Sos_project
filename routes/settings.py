from flask import Blueprint, request, jsonify, session
from models import db, UserSettings

settings_bp = Blueprint('settings', __name__, url_prefix='/api/settings')

def get_current_user_id():
    return session.get('user_id')

@settings_bp.route('', methods=['GET'])
def get_settings():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    settings = UserSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)
        db.session.commit()

    return jsonify({'success': True, 'settings': settings.to_dict()})

@settings_bp.route('', methods=['PUT'])
def update_settings():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    settings = UserSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)

    data = request.get_json() or {}
    if 'gesture_enabled' in data:
        settings.gesture_enabled = 1 if data['gesture_enabled'] else 0
    if 'voice_enabled' in data:
        settings.voice_enabled = 1 if data['voice_enabled'] else 0
    if 'location_enabled' in data:
        settings.location_enabled = 1 if data['location_enabled'] else 0
    if 'gesture_threshold' in data:
        settings.gesture_threshold = int(data['gesture_threshold'])
    if 'emergency_phrases' in data:
        settings.emergency_phrases = str(data['emergency_phrases'])

    db.session.commit()
    return jsonify({'success': True, 'settings': settings.to_dict(), 'message': 'Settings updated'})
