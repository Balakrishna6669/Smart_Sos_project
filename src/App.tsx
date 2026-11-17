import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { User, EmergencyContact, SOSEvent, UserSettings, SystemStatus } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { CountdownModal } from './components/CountdownModal';
import { ManualSosButton } from './components/ManualSosButton';
import { GestureVision } from './components/GestureVision';
import { VoiceDetection } from './components/VoiceDetection';
import { ContactsManager } from './components/ContactsManager';
import { SosHistory } from './components/SosHistory';
import { ProtectionSetup } from './components/ProtectionSetup';
import { SettingsAndDlt } from './components/SettingsAndDlt';
import { PythonProjectDocs } from './components/PythonProjectDocs';
import { UserProfileModal } from './components/UserProfileModal';
import { AuthModal } from './components/AuthModal';
import { GoogleMapsPanel } from './components/GoogleMapsPanel';
import { Emergency3DScene } from './components/Emergency3DScene';

import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
  MapPin,
  Camera,
  Mic,
  Navigation,
  ArrowRight,
  Code2,
  Box
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [events, setEvents] = useState<SOSEvent[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState<boolean>(false);

  // Google Maps Quota Listener (Tier 1 defense)
  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [contactsRes, eventsRes, settingsRes, systemRes] = await Promise.all([
        api.getContacts(),
        api.getSOSHistory({ limit: 50 }),
        api.getSettings(),
        api.getSystemStatus(),
      ]);

      if (contactsRes.success) setContacts(contactsRes.contacts);
      if (eventsRes.success) setEvents(eventsRes.events);
      if (settingsRes.success) setSettings(settingsRes.settings);
      if (systemRes.success) setSystemStatus(systemRes.system);
    } catch (err) {
      console.warn('Data sync warning:', err);
    }
  }, []);

  // Check auth session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.getProfile();
        if (res.success) {
          setCurrentUser(res.user);
          await loadData();
        }
      } catch {
        // Not logged in or expired
        setCurrentUser(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }
    checkAuth();
  }, [loadData]);

  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    await loadData();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setContacts([]);
    setEvents([]);
  };

  // Metrics
  const totalEvents = events.length;
  const consentedContacts = contacts.filter((c) => c.consent).length;
  const successfulSmsCount = events.reduce((acc, ev) => {
    const notifs = ev.notifications || [];
    return acc + notifs.filter((n) => n.delivery_status === 'Delivered' || n.delivery_status === 'Accepted').length;
  }, 0);
  const lastEvent = events[0] || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* 5-second Emergency Countdown Modal (Common SOS Engine) */}
      <CountdownModal />

      {/* Auth Gate */}
      {!currentUser && !isCheckingAuth && (
        <AuthModal onSuccess={handleAuthSuccess} />
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        user={currentUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={(u) => setCurrentUser(u)}
      />

      {/* Header */}
      <Navbar
        user={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Google Maps Platform Demo Quota Banner */}
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onSelectTab={setActiveTab}
          contactCount={contacts.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Top Banner & Emergency Notice */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400">
                        Intelligent Safety Hub
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-xs text-slate-400">
                        Welcome back, {currentUser?.full_name || 'Guardian User'}
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                      Active Emergency Protection
                    </h1>
                    <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-2xl">
                      SOS Guardian monitors manual, AI gesture, and voice triggers. Confirmed emergencies automatically transmit GPS coordinates via MSG91 SMS.
                    </p>
                  </div>

                  {/* Protection state badge */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 self-start md:self-center">
                    <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <div>
                      <span className="text-xs font-bold text-white block">System Ready</span>
                      <span className="text-[11px] text-emerald-400 block">
                        {consentedContacts} Contacts Armed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs font-medium text-slate-400 block mb-1">Total SOS Events</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-black text-white tabular-nums">
                      {totalEvents}
                    </span>
                    <span className="text-xs text-slate-500">logged</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs font-medium text-slate-400 block mb-1">Emergency Contacts</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-black text-emerald-400 tabular-nums">
                      {consentedContacts}
                    </span>
                    <span className="text-xs text-slate-500">verified</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs font-medium text-slate-400 block mb-1">SMS Notifications</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl md:text-3xl font-black text-blue-400 tabular-nums">
                      {successfulSmsCount}
                    </span>
                    <span className="text-xs text-slate-500">dispatches</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-xs font-medium text-slate-400 block mb-1">SMS Provider</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-slate-200">
                      MSG91 Flow
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">v5 API</span>
                  </div>
                </div>
              </div>

              {/* Main Section: Large Red SOS Button Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
                <div className="max-w-md mx-auto">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                    Primary Activation Module
                  </span>
                  <h2 className="text-xl font-extrabold text-white mt-1 mb-2">
                    Manual SOS Trigger
                  </h2>
                  <p className="text-xs text-slate-400 mb-4">
                    Press the button below to start the 5-second countdown. If not cancelled, high-accuracy GPS coordinates will be sent to your emergency contacts via MSG91 SMS.
                  </p>
                </div>

                <ManualSosButton />

                {/* Status Bar for Camera / Mic / Location */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap justify-center items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800">
                    <Camera className="w-3.5 h-3.5 text-blue-400" />
                    <span>AI Gesture Vision: <strong className="text-slate-200">Enabled</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800">
                    <Mic className="w-3.5 h-3.5 text-red-400" />
                    <span>Voice Trigger: <strong className="text-slate-200">&quot;Help me&quot; / &quot;SOS&quot;</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    <span>GPS Engine: <strong className="text-slate-200">High Accuracy</strong></span>
                  </div>
                </div>
              </div>

              {/* Split Row: Multi-Modal Detection Previews */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GestureVision threshold={settings?.gesture_threshold || 8} />
                <VoiceDetection />
              </div>

              {/* Split Row: Google Maps Emergency Radar & 3D Spatial Scene */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      Live Google Maps Radar
                    </span>
                    <button
                      onClick={() => setActiveTab('maps')}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
                    >
                      Expand Map <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <GoogleMapsPanel
                    latitude={lastEvent?.latitude || 28.6139}
                    longitude={lastEvent?.longitude || 77.2090}
                    addressLabel={lastEvent?.address_label}
                    triggerType={lastEvent?.trigger_type}
                  />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-cyan-400" />
                      3D Spatial Dispatch Simulation
                    </span>
                    <button
                      onClick={() => setActiveTab('spatial')}
                      className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      Expand 3D Scene <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <Emergency3DScene
                    latitude={lastEvent?.latitude || 28.6139}
                    longitude={lastEvent?.longitude || 77.2090}
                    triggerType={lastEvent?.trigger_type || 'manual'}
                    isEmergencyActive={false}
                  />
                </div>
              </div>

              {/* Split Row: Recent History & Contacts Snippet */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contacts Snippet */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-red-500" />
                      <h3 className="font-bold text-white text-base">Emergency Contacts ({contacts.length})</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      Manage Contacts <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {contacts.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-4 text-center">No contacts registered yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {contacts.slice(0, 3).map((c) => (
                        <div
                          key={c.id}
                          className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white block">{c.contact_name}</span>
                            <span className="text-[11px] font-mono text-slate-400">{c.mobile_number}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            Consent Verified
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Last Known Event */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <h3 className="font-bold text-white text-base">Last Emergency Event</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      Full Audit Log <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {!lastEvent ? (
                    <p className="text-xs text-slate-500 italic p-4 text-center">No previous emergency events.</p>
                  ) : (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Trigger Type:</span>
                        <span className="font-bold uppercase text-red-400">{lastEvent.trigger_type}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Logged Time:</span>
                        <span className="font-mono text-slate-300">
                          {lastEvent.created_at ? new Date(lastEvent.created_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">GPS Coordinates:</span>
                        <span className="font-mono text-slate-200">
                          {lastEvent.latitude && lastEvent.longitude
                            ? `${lastEvent.latitude.toFixed(4)}, ${lastEvent.longitude.toFixed(4)}`
                            : 'Location unavailable'}
                        </span>
                      </div>
                      {lastEvent.maps_url && (
                        <div className="pt-2 border-t border-slate-800 flex justify-end">
                          <a
                            href={lastEvent.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                          >
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            View on Google Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: MANUAL SOS */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                <span className="text-xs font-bold uppercase tracking-wider text-red-500">
                  Direct Emergency Console
                </span>
                <h1 className="text-3xl font-extrabold text-white mt-1 mb-2">
                  Immediate Manual SOS
                </h1>
                <p className="text-xs md:text-sm text-slate-400 mb-8 max-w-lg mx-auto">
                  Click the button below to initiate emergency protocols. A 5-second countdown window will appear with full cancellation protection before any SMS messages are dispatched.
                </p>

                <ManualSosButton />
              </div>
            </div>
          )}

          {/* TAB: GOOGLE MAPS RADAR */}
          {activeTab === 'maps' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      Geospatial Emergency Tracking
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">Google Maps Emergency Radar</h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Live roadmap and satellite coordinates mapping verified via Google Maps Platform. All emergency coordinates generated by manual, gesture, and voice triggers are mapped in real-time.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('spatial')}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                    >
                      <Box className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Switch to 3D View</span>
                    </button>
                  </div>
                </div>
              </div>

              <GoogleMapsPanel
                latitude={lastEvent?.latitude || 28.6139}
                longitude={lastEvent?.longitude || 77.2090}
                addressLabel={lastEvent?.address_label || 'New Delhi Central Command / Live User Node'}
                triggerType={lastEvent?.trigger_type || 'Manual SOS'}
              />
            </div>
          )}

          {/* TAB: 3D SPATIAL DISPATCH */}
          {activeTab === 'spatial' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                      Interactive Three.js WebGL Simulation
                    </span>
                    <h2 className="text-2xl font-black text-white mt-1">3D Spatial Emergency Dispatch</h2>
                    <p className="text-xs text-slate-400 mt-1 max-w-xl">
                      Real-time procedural beacon visualization rendered with Three.js ACESFilmicToneMapping and RoomEnvironment lighting. Interactive orbit controls, radar sweeps, and tactical perimeter layers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('maps')}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>Switch to Google Maps</span>
                    </button>
                  </div>
                </div>
              </div>

              <Emergency3DScene
                latitude={lastEvent?.latitude || 28.6139}
                longitude={lastEvent?.longitude || 77.2090}
                triggerType={lastEvent?.trigger_type || 'manual'}
                isEmergencyActive={false}
              />
            </div>
          )}

          {/* TAB: AI GESTURE */}
          {activeTab === 'gesture' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <GestureVision threshold={settings?.gesture_threshold || 8} />
            </div>
          )}

          {/* TAB: VOICE SOS */}
          {activeTab === 'voice' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <VoiceDetection />
            </div>
          )}

          {/* TAB: EMERGENCY CONTACTS */}
          {activeTab === 'contacts' && (
            <ContactsManager
              contacts={contacts}
              onRefresh={loadData}
              onNavigateToSettings={() => setActiveTab('settings')}
              isLiveSms={Boolean(settings?.sms_enabled && settings?.msg91_auth_key && settings?.msg91_template_id)}
              userName={currentUser?.full_name}
              lastMapsUrl={lastEvent?.maps_url}
            />
          )}

          {/* TAB: SOS HISTORY */}
          {activeTab === 'history' && (
            <SosHistory events={events} onRefresh={loadData} />
          )}

          {/* TAB: PROTECTION SETUP */}
          {activeTab === 'setup' && (
            <ProtectionSetup />
          )}

          {/* TAB: SETTINGS & DLT */}
          {activeTab === 'settings' && (
            <SettingsAndDlt
              settings={settings}
              onUpdate={(updated) => setSettings(updated)}
            />
          )}

          {/* TAB: PYTHON & PROJECT SPECS */}
          {activeTab === 'docs' && (
            <PythonProjectDocs />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden flex items-center justify-around bg-slate-950 border-t border-slate-800 py-2.5 px-2 sticky bottom-0 z-40">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'dashboard' ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Home</span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'manual' ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>SOS</span>
        </button>
        <button
          onClick={() => setActiveTab('gesture')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'gesture' ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Vision</span>
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'voice' ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Voice</span>
        </button>
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'contacts' ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Contacts</span>
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            activeTab === 'docs' ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Docs</span>
        </button>
      </div>
    </div>
  );
}
