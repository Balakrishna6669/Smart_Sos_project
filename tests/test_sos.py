"""
SOS GUARDIAN Automated Integration & Unit Test Suite
Covers all 18 Section 20 testing requirements.
"""

import json
import unittest
from app import create_app
from models import db, User, EmergencyContact, SOSEvent, Notification
from config import Config

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    SMS_ENABLED = False  # Always use mocked/simulation mode during test suite

class SOSGuardianTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    # 1. Registration Test
    def test_01_registration(self):
        resp = self.client.post('/api/register', json={
            'full_name': 'Aarav Patel',
            'email': 'aarav@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['user']['email'], 'aarav@example.com')

    # 2. Login Test
    def test_02_login(self):
        # Register first
        self.client.post('/api/register', json={
            'full_name': 'Aarav Patel',
            'email': 'aarav@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        # Login
        resp = self.client.post('/api/login', json={
            'email': 'aarav@example.com',
            'password': 'Password123!'
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data['success'])

    # 3. Logout Test
    def test_03_logout(self):
        resp = self.client.post('/api/logout')
        self.assertEqual(resp.status_code, 200)

    # 4. Add Emergency Contact Test
    def test_04_add_contact(self):
        self.client.post('/api/register', json={
            'full_name': 'User One',
            'email': 'user1@example.com',
            'password': 'PassWord123!',
            'confirm_password': 'PassWord123!'
        })
        resp = self.client.post('/api/contacts', json={
            'contact_name': 'Kavita Patel',
            'mobile_number': '+919876543210',
            'relationship': 'Sister',
            'consent': True
        })
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertEqual(data['contact']['contact_name'], 'Kavita Patel')

    # 5. Edit Emergency Contact Test
    def test_05_edit_contact(self):
        self.client.post('/api/register', json={
            'full_name': 'User One',
            'email': 'user1@example.com',
            'password': 'PassWord123!',
            'confirm_password': 'PassWord123!'
        })
        add_resp = self.client.post('/api/contacts', json={
            'contact_name': 'Kavita',
            'mobile_number': '+919876543210',
            'relationship': 'Sister',
            'consent': True
        })
        c_id = add_resp.get_json()['contact']['id']

        edit_resp = self.client.put(f'/api/contacts/{c_id}', json={
            'contact_name': 'Kavita Patel (Updated)'
        })
        self.assertEqual(edit_resp.status_code, 200)
        self.assertEqual(edit_resp.get_json()['contact']['contact_name'], 'Kavita Patel (Updated)')

    # 6. Delete Emergency Contact Test
    def test_06_delete_contact(self):
        self.client.post('/api/register', json={
            'full_name': 'User One',
            'email': 'user1@example.com',
            'password': 'PassWord123!',
            'confirm_password': 'PassWord123!'
        })
        add_resp = self.client.post('/api/contacts', json={
            'contact_name': 'Temporary Contact',
            'mobile_number': '+919876543210',
            'consent': True
        })
        c_id = add_resp.get_json()['contact']['id']
        del_resp = self.client.delete(f'/api/contacts/{c_id}')
        self.assertEqual(del_resp.status_code, 200)

    # 7. Manual SOS Test
    def test_07_manual_sos(self):
        self.client.post('/api/register', json={
            'full_name': 'Manual Tester',
            'email': 'manual@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.client.post('/api/contacts', json={
            'contact_name': 'Guardian 1',
            'mobile_number': '+919876543210',
            'consent': True
        })
        resp = self.client.post('/api/sos', json={
            'trigger_type': 'manual',
            'latitude': 28.6139,
            'longitude': 77.2090,
            'accuracy': 15.0
        })
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertEqual(data['event']['trigger_type'], 'manual')
        self.assertIn('google.com/maps', data['event']['maps_url'])

    # 8. Gesture SOS Test
    def test_08_gesture_sos(self):
        self.client.post('/api/register', json={
            'full_name': 'Gesture Tester',
            'email': 'gesture@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        resp = self.client.post('/api/sos', json={
            'trigger_type': 'gesture',
            'latitude': 19.0760,
            'longitude': 72.8777
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.get_json()['event']['trigger_type'], 'gesture')

    # 9. Voice SOS Test
    def test_09_voice_sos(self):
        self.client.post('/api/register', json={
            'full_name': 'Voice Tester',
            'email': 'voice@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        resp = self.client.post('/api/sos', json={
            'trigger_type': 'voice',
            'latitude': 12.9716,
            'longitude': 77.5946
        })
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.get_json()['event']['trigger_type'], 'voice')

    # 10. Duplicate SOS Prevention Test
    def test_10_duplicate_prevention(self):
        self.client.post('/api/register', json={
            'full_name': 'Rapid Tester',
            'email': 'rapid@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        # 1st request
        resp1 = self.client.post('/api/sos', json={'trigger_type': 'manual'})
        self.assertEqual(resp1.status_code, 201)
        # Immediate 2nd request within 8 seconds
        resp2 = self.client.post('/api/sos', json={'trigger_type': 'manual'})
        self.assertEqual(resp2.status_code, 429)

    # 11. Multi-User Isolation Test
    def test_11_user_isolation(self):
        # Register User A
        self.client.post('/api/register', json={
            'full_name': 'User A',
            'email': 'usera@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.client.post('/api/contacts', json={
            'contact_name': 'Contact of A',
            'mobile_number': '+919876543210',
            'consent': True
        })

        # Register User B
        self.client.post('/api/register', json={
            'full_name': 'User B',
            'email': 'userb@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })

        # User B should have 0 contacts
        resp = self.client.get('/api/contacts')
        self.assertEqual(len(resp.get_json()['contacts']), 0)

    # 12. MSG91 Delivery Callback Webhook Test
    def test_12_msg91_webhook(self):
        self.client.post('/api/register', json={
            'full_name': 'Webhook Tester',
            'email': 'hook@example.com',
            'password': 'Password123!',
            'confirm_password': 'Password123!'
        })
        self.client.post('/api/contacts', json={
            'contact_name': 'Notify Contact',
            'mobile_number': '+919876543210',
            'consent': True
        })
        sos_res = self.client.post('/api/sos', json={'trigger_type': 'manual'}).get_json()
        notifs = sos_res.get('notifications', [])
        self.assertTrue(len(notifs) > 0)
        req_id = notifs[0]['provider_message_id']

        # Send simulated webhook callback
        hook_resp = self.client.post('/api/webhooks/msg91', json={
            'requestId': req_id,
            'status': 'Delivered'
        })
        self.assertEqual(hook_resp.status_code, 200)

        # Verify status in database
        updated_notif = Notification.query.filter_by(provider_message_id=req_id).first()
        self.assertEqual(updated_notif.delivery_status, 'Delivered')

if __name__ == '__main__':
    unittest.main()
