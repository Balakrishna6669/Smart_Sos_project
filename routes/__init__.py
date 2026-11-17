from routes.auth import auth_bp
from routes.contacts import contacts_bp
from routes.sos import sos_bp
from routes.notifications import notifications_bp
from routes.settings import settings_bp
from routes.webhooks import webhooks_bp

__all__ = ['auth_bp', 'contacts_bp', 'sos_bp', 'notifications_bp', 'settings_bp', 'webhooks_bp']
