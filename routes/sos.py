from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, session
from models import db, User, SOSEvent, EmergencyContact, Notification
from services.sms_service import send_emergency_sms

sos_bp = Blueprint('sos', __name__, url_prefix='/api/sos')

def get_current_user_id():
    return session.get('user_id')

@sos_bp.route('', methods=['POST'])
def trigger_sos():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    data = request.get_json() or {}
    trigger_type = data.get('trigger_type', '').lower()

    if trigger_type not in ['manual', 'gesture', 'voice']:
        return jsonify({'success': False, 'error': 'Invalid trigger type. Must be manual, gesture, or voice'}), 400

    # Anti-duplicate protection: check if an SOS was created within 8 seconds
    cutoff = datetime.utcnow() - timedelta(seconds=8)
    recent = SOSEvent.query.filter(
        SOSEvent.user_id == user_id,
        SOSEvent.created_at >= cutoff
    ).first()

    if recent:
        return jsonify({
            'success': False,
            'error': 'Duplicate emergency event prevented. Request already processed.',
            'event_id': recent.id
        }), 429

    user = User.query.get(user_id)
    lat = data.get('latitude')
    lng = data.get('longitude')
    accuracy = data.get('accuracy')
    address_label = data.get('address_label')

    maps_url = 'Location unavailable'
    if lat is not None and lng is not None:
        maps_url = f"https://www.google.com/maps?q={lat},{lng}"

    event = SOSEvent(
        user_id=user_id,
        trigger_type=trigger_type,
        latitude=float(lat) if lat is not None else None,
        longitude=float(lng) if lng is not None else None,
        accuracy=float(accuracy) if accuracy is not None else None,
        maps_url=maps_url,
        status='Confirmed',
        address_label=address_label or (f"GPS: {lat:.5f}, {lng:.5f}" if lat is not None else "Manual SOS Location")
    )
    db.session.add(event)
    db.session.commit()

    # Query consented emergency contacts
    contacts = EmergencyContact.query.filter_by(user_id=user_id, consent=1).all()
    recipients = [
        {'contact_id': c.id, 'name': c.contact_name, 'mobile': c.mobile_number}
        for c in contacts
    ]

    sms_results = []
    if recipients:
        sms_results = send_emergency_sms(
            recipients=recipients,
            user_name=user.full_name,
            trigger_type=trigger_type,
            location_url=maps_url,
            event_id=event.id
        )

    return jsonify({
        'success': True,
        'event': event.to_dict(),
        'notifications': sms_results,
        'contacts_notified_count': len(recipients),
        'message': f"Emergency confirmed. {len(recipients)} emergency contacts alerted via MSG91 SMS."
    }), 201

@sos_bp.route('/history', methods=['GET'])
def sos_history():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    trigger = request.args.get('trigger')
    query = SOSEvent.query.filter_by(user_id=user_id)

    if trigger in ['manual', 'gesture', 'voice']:
        query = query.filter_by(trigger_type=trigger)

    events = query.order_by(SOSEvent.id.desc()).limit(100).all()
    result = []
    for ev in events:
        ev_dict = ev.to_dict()
        ev_dict['notifications'] = [n.to_dict() for n in ev.notifications]
        result.append(ev_dict)

    return jsonify({'success': True, 'events': result})

@sos_bp.route('/<int:event_id>', methods=['GET'])
def get_sos_event(event_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    event = SOSEvent.query.filter_by(id=event_id, user_id=user_id).first()
    if not event:
        return jsonify({'success': False, 'error': 'Event not found'}), 404

    ev_dict = event.to_dict()
    ev_dict['notifications'] = [n.to_dict() for n in event.notifications]
    return jsonify({'success': True, 'event': ev_dict})

@sos_bp.route('/<int:event_id>/notifications', methods=['GET'])
def get_event_notifications(event_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    event = SOSEvent.query.filter_by(id=event_id, user_id=user_id).first()
    if not event:
        return jsonify({'success': False, 'error': 'Event not found'}), 404

    notifications = Notification.query.filter_by(event_id=event_id).all()
    return jsonify({'success': True, 'notifications': [n.to_dict() for n in notifications]})
