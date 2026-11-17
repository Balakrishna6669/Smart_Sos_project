from flask import Blueprint, request, jsonify, session
from models import db, EmergencyContact
from services.sms_service import validate_mobile_number

contacts_bp = Blueprint('contacts', __name__, url_prefix='/api/contacts')

def get_current_user_id():
    return session.get('user_id')

@contacts_bp.route('', methods=['GET'])
def list_contacts():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    contacts = EmergencyContact.query.filter_by(user_id=user_id).order_by(EmergencyContact.id.desc()).all()
    return jsonify({'success': True, 'contacts': [c.to_dict() for c in contacts]})

@contacts_bp.route('', methods=['POST'])
def add_contact():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    data = request.get_json() or {}
    name = data.get('contact_name', '').strip()
    mobile = data.get('mobile_number', '').strip()
    relationship = data.get('relationship', 'Other').strip()
    consent = data.get('consent')

    if not name or not mobile:
        return jsonify({'success': False, 'error': 'Contact name and mobile number are required'}), 400

    if consent not in [True, 1, 'true', '1']:
        return jsonify({'success': False, 'error': 'Explicit consent is mandatory for emergency SMS alerts'}), 400

    try:
        validate_mobile_number(mobile)
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400

    contact = EmergencyContact(
        user_id=user_id,
        contact_name=name,
        mobile_number=mobile,
        relationship=relationship,
        consent=1
    )
    db.session.add(contact)
    db.session.commit()

    return jsonify({'success': True, 'contact': contact.to_dict(), 'message': 'Emergency contact added'}), 201

@contacts_bp.route('/<int:contact_id>', methods=['PUT'])
def update_contact(contact_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    contact = EmergencyContact.query.filter_by(id=contact_id, user_id=user_id).first()
    if not contact:
        return jsonify({'success': False, 'error': 'Contact not found'}), 404

    data = request.get_json() or {}
    if 'contact_name' in data and data['contact_name'].strip():
        contact.contact_name = data['contact_name'].strip()
    if 'mobile_number' in data and data['mobile_number'].strip():
        try:
            validate_mobile_number(data['mobile_number'].strip())
            contact.mobile_number = data['mobile_number'].strip()
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400
    if 'relationship' in data:
        contact.relationship = data['relationship']
    if 'consent' in data:
        contact.consent = 1 if data['consent'] in [True, 1, 'true', '1'] else 0

    db.session.commit()
    return jsonify({'success': True, 'contact': contact.to_dict(), 'message': 'Contact updated'})

@contacts_bp.route('/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    contact = EmergencyContact.query.filter_by(id=contact_id, user_id=user_id).first()
    if not contact:
        return jsonify({'success': False, 'error': 'Contact not found'}), 404

    db.session.delete(contact)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Contact deleted successfully'})
