import { User, EmergencyContact, SOSEvent, UserSettings, SystemStatus, NotificationItem, TriggerType } from '../types';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('sos_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('sos_token', token);
    } else {
      localStorage.removeItem('sos_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  }

  // Auth
  async register(full_name: string, email: string, password: string, confirm_password: string): Promise<{ success: boolean; user: User; token: string }> {
    const res = await this.request<{ success: boolean; user: User; token: string }>('/api/register', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, password, confirm_password }),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async login(email: string, password: string): Promise<{ success: boolean; user: User; token: string }> {
    const res = await this.request<{ success: boolean; user: User; token: string }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async logout(): Promise<{ success: boolean }> {
    try {
      await this.request('/api/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
    return { success: true };
  }

  async getProfile(): Promise<{ success: boolean; user: User }> {
    return this.request<{ success: boolean; user: User }>('/api/profile');
  }

  async updateProfile(updates: Partial<User> & { new_password?: string }): Promise<{ success: boolean; user: User; message: string }> {
    return this.request<{ success: boolean; user: User; message: string }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Contacts
  async getContacts(): Promise<{ success: boolean; contacts: EmergencyContact[] }> {
    return this.request<{ success: boolean; contacts: EmergencyContact[] }>('/api/contacts');
  }

  async addContact(contact: { contact_name: string; mobile_number: string; relationship?: string; consent: boolean }): Promise<{ success: boolean; contact: EmergencyContact; message: string }> {
    return this.request<{ success: boolean; contact: EmergencyContact; message: string }>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  }

  async updateContact(id: number, updates: Partial<EmergencyContact>): Promise<{ success: boolean; contact: EmergencyContact; message: string }> {
    return this.request<{ success: boolean; contact: EmergencyContact; message: string }>(`/api/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteContact(id: number): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/contacts/${id}`, {
      method: 'DELETE',
    });
  }

  // SOS
  async triggerSOS(data: {
    trigger_type: TriggerType;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    address_label?: string;
  }): Promise<{
    success: boolean;
    event: SOSEvent;
    notifications: any[];
    contacts_notified_count: number;
    message: string;
  }> {
    return this.request('/api/sos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSOSHistory(params?: { trigger?: string; limit?: number }): Promise<{ success: boolean; events: SOSEvent[] }> {
    const query = new URLSearchParams();
    if (params?.trigger && params.trigger !== 'all') query.set('trigger', params.trigger);
    if (params?.limit) query.set('limit', String(params.limit));

    const url = `/api/sos/history${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<{ success: boolean; events: SOSEvent[] }>(url);
  }

  async getSOSEvent(id: number): Promise<{ success: boolean; event: SOSEvent }> {
    return this.request<{ success: boolean; event: SOSEvent }>(`/api/sos/${id}`);
  }

  async getEventNotifications(id: number): Promise<{ success: boolean; notifications: NotificationItem[] }> {
    return this.request<{ success: boolean; notifications: NotificationItem[] }>(`/api/sos/${id}/notifications`);
  }

  // Test notification
  async testNotification(contact_id: number): Promise<{ success: boolean; result: any; message: string }> {
    return this.request('/api/notifications/test', {
      method: 'POST',
      body: JSON.stringify({ contact_id }),
    });
  }

  async testTelegram(): Promise<{ success: boolean; message: string }> {
    return this.request('/api/notifications/test-telegram', {
      method: 'POST',
    });
  }

  // Settings
  async getSettings(): Promise<{ success: boolean; settings: UserSettings }> {
    return this.request<{ success: boolean; settings: UserSettings }>('/api/settings');
  }

  async updateSettings(settings: Partial<UserSettings>): Promise<{ success: boolean; settings: UserSettings; message: string }> {
    return this.request<{ success: boolean; settings: UserSettings; message: string }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // System Status
  async getSystemStatus(): Promise<{ success: boolean; system: SystemStatus }> {
    return this.request<{ success: boolean; system: SystemStatus }>('/api/system/status');
  }
}

export const api = new ApiService();
