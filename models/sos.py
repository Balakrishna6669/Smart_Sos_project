from datetime import datetime
from models import db

class SOSEvent(db.Model):
    __tablename__ = 'sos_events'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    trigger_type = db.Column(db.String(20), nullable=False)  # manual, gesture, voice
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    accuracy = db.Column(db.Float, nullable=True)
    maps_url = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(30), default='Confirmed')
    address_label = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    notifications = db.relationship('Notification', backref='sos_event', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'trigger_type': self.trigger_type,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'accuracy': self.accuracy,
            'maps_url': self.maps_url,
            'status': self.status,
            'address_label': self.address_label,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
