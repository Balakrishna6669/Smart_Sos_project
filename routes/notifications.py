from flask import Blueprint, request, jsonify, session
from models import User, EmergencyContact
from services.sms_service import send_emergency_sms

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

def get_current_user_id():
    return session.get('user_id')

@notifications_bp.route('/test', methods=['POST'])
def test_notification():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    data = request.get_json() or {}
    contact_id = data.get('contact_id')

    if not contact_id:
        return jsonify({'success': False, 'error': 'contact_id is required'}), 400

    contact = EmergencyContact.query.filter_by(id=contact_id, user_id=user_id).first()
    if not contact:
        return jsonify({'success': False, 'error': 'Contact not found'}), 404

    user = User.query.get(user_id)
    results = send_emergency_sms(
        recipients=[{'contact_id': contact.id, 'name': contact.contact_name, 'mobile': contact.mobile_number}],
        user_name=user.full_name,
        trigger_type='test',
        location_url='https://www.google.com/maps?q=28.6139,77.2090',
        event_id=None
    )

    return jsonify({
        'success': True,
        'result': results[0] if results else None,
        'message': f"Test notification processed for {contact.contact_name}"
    })
