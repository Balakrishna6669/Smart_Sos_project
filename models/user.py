from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from models import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    medical_notes = db.Column(db.Text, nullable=True)
    blood_group = db.Column(db.String(10), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    contacts = db.relationship('EmergencyContact', backref='user', cascade='all, delete-orphan', lazy=True)
    sos_events = db.relationship('SOSEvent', backref='user', cascade='all, delete-orphan', lazy=True)
    settings = db.relationship('UserSettings', backref='user', uselist=False, cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'medical_notes': self.medical_notes,
            'blood_group': self.blood_group,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
