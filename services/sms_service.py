"""
SOS GUARDIAN - MSG91 FLOW SMS SERVICE MODULE
Official Documentation: https://docs.msg91.com/

This module coordinates:
1. Secure credential retrieval from environment variables
2. Destination number validation (Indian E.164 format)
3. MSG91 Flow API payload construction with approved DLT template variables
4. HTTP request dispatch with timeout and error resilience
5. Database logging of message ID and delivery status (Pending, Accepted, Delivered, Failed)
"""

import os
import re
import json
import time
import requests
from datetime import datetime
from models import db, Notification

MSG91_FLOW_ENDPOINT = "https://control.msg91.com/api/v5/flow/"

def validate_mobile_number(mobile: str) -> str:
    """
    Validates and formats an Indian mobile number.
    Returns cleaned digits (e.g. 919876543210).
    Raises ValueError if invalid.
    """
    if not mobile:
        raise ValueError("Mobile number cannot be empty")

    cleaned = re.sub(r'[^0-9]', '', mobile)
    
    # If 10 digits (standard Indian mobile format)
    if len(cleaned) == 10:
        if cleaned[0] not in ['6', '7', '8', '9']:
            raise ValueError(f"Invalid Indian mobile number: {mobile}. Must start with 6, 7, 8, or 9.")
        return '91' + cleaned
        
    # If 12 digits starting with 91
    if len(cleaned) == 12 and cleaned.startswith('91'):
        if cleaned[2] not in ['6', '7', '8', '9']:
            raise ValueError(f"Invalid Indian mobile number: {mobile}.")
        return cleaned

    # Other international numbers (10 to 15 digits)
    if 10 <= len(cleaned) <= 15:
        return cleaned

    raise ValueError(f"Invalid mobile number format: {mobile}. Expected 10-15 digits.")

def send_emergency_sms(
    recipients: list,
    user_name: str,
    trigger_type: str,
    location_url: str,
    event_id: int = None
) -> list:
    """
    Sends emergency SMS alerts to a list of recipients via MSG91 Flow SMS API.
    
    Each recipient is a dict: {'contact_id': int, 'name': str, 'mobile': str}
    Returns a list of dispatch results.
    """
    auth_key = os.getenv('MSG91_AUTH_KEY', '').strip()
    template_id = os.getenv('MSG91_TEMPLATE_ID', '').strip()
    sms_enabled = os.getenv('SMS_ENABLED', 'false').lower() in ('true', '1', 't')

    results = []
    current_time_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    for rec in recipients:
        contact_id = rec.get('contact_id')
        contact_name = rec.get('name', 'Contact')
        raw_mobile = rec.get('mobile', '')

        try:
            formatted_mobile = validate_mobile_number(raw_mobile)
        except ValueError as e:
            results.append({
                'contact_id': contact_id,
                'mobile_number': raw_mobile,
                'delivery_status': 'Failed',
                'provider_message_id': f"err_{int(time.time())}",
                'provider_response': {'error': str(e)}
            })
            continue

        if sms_enabled and auth_key and template_id:
            # Production MSG91 Flow API call
            payload = {
                "template_id": template_id,
                "short_url": "0",
                "recipients": [
                    {
                        "mobiles": formatted_mobile,
                        "name": contact_name,
                        "user_name": user_name,
                        "trigger": f"{trigger_type.upper()} SOS",
                        "time": current_time_str,
                        "location_url": location_url
                    }
                ]
            }

            headers = {
                "authkey": auth_key,
                "content-type": "application/json",
                "accept": "application/json"
            }

            try:
                response = requests.post(
                    MSG91_FLOW_ENDPOINT,
                    json=payload,
                    headers=headers,
                    timeout=8
                )
                
                try:
                    resp_data = response.json()
                except Exception:
                    resp_data = {"raw_text": response.text}

                is_ok = response.status_code == 200 and (
                    resp_data.get('type') == 'success' or resp_data.get('status') == 'success'
                )
                
                message_id = resp_data.get('request_id') or resp_data.get('message') or f"msg91_{int(time.time())}"
                delivery_status = 'Accepted' if is_ok else 'Failed'

                results.append({
                    'contact_id': contact_id,
                    'mobile_number': raw_mobile,
                    'delivery_status': delivery_status,
                    'provider_message_id': message_id,
                    'provider_response': resp_data
                })

            except requests.exceptions.RequestException as req_err:
                results.append({
                    'contact_id': contact_id,
                    'mobile_number': raw_mobile,
                    'delivery_status': 'Failed',
                    'provider_message_id': f"err_{int(time.time())}",
                    'provider_response': {'error': f"Network error to MSG91: {str(req_err)}"}
                })
        else:
            # Development / Simulation Test Mode
            simulated_req_id = f"req_msg91_sim_{int(time.time())}_{contact_id or 1}"
            simulated_response = {
                "type": "success",
                "status": "simulated_accepted",
                "request_id": simulated_req_id,
                "message": "Campaign request accepted in simulation/test mode",
                "dlt_template_variables": {
                    "user_name": user_name,
                    "trigger": f"{trigger_type.upper()} SOS",
                    "time": current_time_str,
                    "location_url": location_url
                },
                "notice": "SMS_ENABLED is false or MSG91 credentials not set. Simulated response logged for review."
            }

            results.append({
                'contact_id': contact_id,
                'mobile_number': raw_mobile,
                'delivery_status': 'Accepted',
                'provider_message_id': simulated_req_id,
                'provider_response': simulated_response
            })

    # Save to database if event_id is provided
    if event_id:
        for res in results:
            notif = Notification(
                event_id=event_id,
                contact_id=res['contact_id'],
                mobile_number=res['mobile_number'],
                provider='MSG91',
                provider_message_id=res['provider_message_id'],
                provider_response=json.dumps(res['provider_response']),
                delivery_status=res['delivery_status']
            )
            db.session.add(notif)
        db.session.commit()

    return results
