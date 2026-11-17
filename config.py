import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration for SOS Guardian Flask backend."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'sos_guardian_super_secret_production_key_2026')
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'sos_guardian.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # MSG91 Flow SMS Integration Credentials
    MSG91_AUTH_KEY = os.getenv('MSG91_AUTH_KEY', '')
    MSG91_TEMPLATE_ID = os.getenv('MSG91_TEMPLATE_ID', '')
    SMS_ENABLED = os.getenv('SMS_ENABLED', 'false').lower() in ('true', '1', 't')
    
    # Session & Security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours
