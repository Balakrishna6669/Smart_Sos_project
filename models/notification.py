from datetime import datetime
from models import db

class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey('sos_events.id', ondelete='CASCADE'), nullable=True)
    contact_id = db.Column(db.Integer, db.ForeignKey('emergency_contacts.id', ondelete='SET NULL'), nullable=True)
    mobile_number = db.Column(db.String(20), nullable=False)
    provider = db.Column(db.String(50), default='MSG91')
    provider_message_id = db.Column(db.String(100), nullable=True)
    provider_response = db.Column(db.Text, nullable=True)
    delivery_status = db.Column(db.String(30), default='Pending')  # Pending, Accepted, Delivered, Failed, Unknown
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    delivered_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'event_id': self.event_id,
            'contact_id': self.contact_id,
            'mobile_number': self.mobile_number,
            'provider': self.provider,
            'provider_message_id': self.provider_message_id,
            'provider_response': self.provider_response,
            'delivery_status': self.delivery_status,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None
        }
