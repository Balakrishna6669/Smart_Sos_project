from datetime import datetime
from models import db

class UserSettings(db.Model):
    __tablename__ = 'user_settings'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    gesture_enabled = db.Column(db.Integer, default=1, nullable=False)
    voice_enabled = db.Column(db.Integer, default=1, nullable=False)
    location_enabled = db.Column(db.Integer, default=1, nullable=False)
    gesture_threshold = db.Column(db.Integer, default=8, nullable=False)
    emergency_phrases = db.Column(db.String(255), default='sos,help me,emergency', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'gesture_enabled': bool(self.gesture_enabled),
            'voice_enabled': bool(self.voice_enabled),
            'location_enabled': bool(self.location_enabled),
            'gesture_threshold': self.gesture_threshold,
            'emergency_phrases': self.emergency_phrases,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
