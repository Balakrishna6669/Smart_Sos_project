export type TriggerType = 'manual' | 'gesture' | 'voice' | 'test';

export type DeliveryStatus = 'Pending' | 'Accepted' | 'Delivered' | 'Failed' | 'Unknown';

export interface User {
  id: number;
  full_name: string;
  email: string;
  medical_notes?: string;
  blood_group?: string;
  created_at?: string;
}

export interface EmergencyContact {
  id: number;
  user_id: number;
  contact_name: string;
  mobile_number: string;
  relationship: string;
  consent: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  event_id: number;
  contact_id: number;
  contact_name?: string;
  mobile_number: string;
  provider: string;
  provider_message_id: string;
  provider_response: string | Record<string, any>;
  delivery_status: DeliveryStatus;
  sent_at: string;
  delivered_at?: string;
}

export interface SOSEvent {
  id: number;
  user_id: number;
  trigger_type: TriggerType;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  maps_url: string;
  status: string;
  address_label?: string;
  created_at: string;
  notifications?: NotificationItem[];
}

export interface UserSettings {
  id: number;
  user_id: number;
  gesture_enabled: boolean;
  voice_enabled: boolean;
  location_enabled: boolean;
  gesture_threshold: number;
  emergency_phrases: string;
  msg91_auth_key?: string;
  msg91_template_id?: string;
  sms_enabled?: boolean;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  telegram_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SystemStatus {
  name: string;
  version: string;
  database: string;
  sms_provider: string;
  sms_configured: boolean;
  sms_enabled: boolean;
  has_auth_key: boolean;
  has_template_id: boolean;
  dlt_flow_endpoint: string;
  stats: {
    users: number;
    sos_events: number;
    notifications: number;
  };
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  addressLabel?: string;
}
