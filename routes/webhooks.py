import json
from datetime import datetime
from flask import Blueprint, request, jsonify
from models import db, Notification

webhooks_bp = Blueprint('webhooks', __name__, url_prefix='/api/webhooks')

@webhooks_bp.route('/msg91', methods=['POST'])
def msg91_dlr_webhook():
    """
    Handles MSG91 Flow Delivery Reports (DLR) webhook callbacks.
    Updates notification status in database to Delivered or Failed.
    """
    data = request.get_json(silent=True) or request.form.to_dict() or {}
    
    request_id = data.get('requestId') or data.get('request_id') or (data.get('data') or {}).get('requestId')
    status = data.get('status') or (data.get('data') or {}).get('status') or 'Unknown'

    if request_id:
        notif = Notification.query.filter_by(provider_message_id=str(request_id)).first()
        if notif:
            s_lower = str(status).lower()
            if 'deliver' in s_lower or 'success' in s_lower:
                notif.delivery_status = 'Delivered'
                notif.delivered_at = datetime.utcnow()
            elif 'fail' in s_lower or 'reject' in s_lower:
                notif.delivery_status = 'Failed'
            elif 'accept' in s_lower:
                notif.delivery_status = 'Accepted'

            notif.provider_response = json.dumps({'webhook_event': data})
            db.session.commit()

    return jsonify({'success': True, 'message': 'MSG91 webhook processed'})
