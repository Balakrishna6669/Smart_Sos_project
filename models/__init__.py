from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from models.user import User
from models.contact import EmergencyContact
from models.sos import SOSEvent
from models.notification import Notification
from models.settings import UserSettings

__all__ = ['db', 'User', 'EmergencyContact', 'SOSEvent', 'Notification', 'UserSettings']
