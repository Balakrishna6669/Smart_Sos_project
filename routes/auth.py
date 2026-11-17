import re
from flask import Blueprint, request, jsonify, session
from models import db, User, UserSettings

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

def get_current_user_id():
    """Extract user_id from session or Authorization header."""
    if 'user_id' in session:
        return session['user_id']
    return None

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')

    if not full_name or not email or not password:
        return jsonify({'success': False, 'error': 'Full name, email, and password are required'}), 400

    if password != confirm_password:
        return jsonify({'success': False, 'error': 'Passwords do not match'}), 400

    if len(password) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters long'}), 400

    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return jsonify({'success': False, 'error': 'Invalid email format'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'error': 'An account with this email already exists'}), 409

    user = User(full_name=full_name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    # Initialize default settings
    settings = UserSettings(user_id=user.id, gesture_enabled=1, voice_enabled=1, location_enabled=1)
    db.session.add(settings)
    db.session.commit()

    session['user_id'] = user.id
    session.permanent = True

    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'message': 'Account registered successfully'
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

    session['user_id'] = user.id
    session.permanent = True

    return jsonify({
        'success': True,
        'user': user.to_dict(),
        'message': 'Logged in successfully'
    })

@auth_bp.route('/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@auth_bp.route('/profile', methods=['GET', 'PUT'])
def profile():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 404

    if request.method == 'GET':
        return jsonify({'success': True, 'user': user.to_dict()})

    data = request.get_json() or {}
    if 'full_name' in data and data['full_name'].strip():
        user.full_name = data['full_name'].strip()
    if 'medical_notes' in data:
        user.medical_notes = data['medical_notes']
    if 'blood_group' in data:
        user.blood_group = data['blood_group']
    if 'new_password' in data and len(data['new_password']) >= 6:
        user.set_password(data['new_password'])

    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict(), 'message': 'Profile updated'})
