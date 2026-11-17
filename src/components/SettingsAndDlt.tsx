import React, { useState, useEffect } from 'react';
import { UserSettings, SystemStatus } from '../types';
import { api } from '../services/api';
import {
  Settings,
  Shield,
  Sliders,
  Smartphone,
  CheckCircle,
  Info,
  ExternalLink,
  HelpCircle,
  Save,
  Radio,
  AlertCircle,
  Key
} from 'lucide-react';

interface SettingsAndDltProps {
  settings: UserSettings | null;
  onUpdate: (updated: UserSettings) => void;
}

export const SettingsAndDlt: React.FC<SettingsAndDltProps> = ({ settings, onUpdate }) => {
  const [gestureEnabled, setGestureEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [locationEnabled, setLocationEnabled] = useState<boolean>(true);
  const [gestureThreshold, setGestureThreshold] = useState<number>(8);
  const [emergencyPhrases, setEmergencyPhrases] = useState<string>('sos,help me,emergency');
  const [msg91AuthKey, setMsg91AuthKey] = useState<string>('');
  const [msg91TemplateId, setMsg91TemplateId] = useState<string>('');
  const [smsEnabled, setSmsEnabled] = useState<boolean>(false);
  
  // Alternative Alert: Telegram Bot Settings
  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(false);
  const [telegramBotToken, setTelegramBotToken] = useState<string>('');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [telegramTestStatus, setTelegramTestStatus] = useState<string | null>(null);

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setGestureEnabled(settings.gesture_enabled);
      setVoiceEnabled(settings.voice_enabled);
      setLocationEnabled(settings.location_enabled);
      setGestureThreshold(settings.gesture_threshold || 8);
      setEmergencyPhrases(settings.emergency_phrases || 'sos,help me,emergency');
      setMsg91AuthKey(settings.msg91_auth_key || '');
      setMsg91TemplateId(settings.msg91_template_id || '');
      setSmsEnabled(Boolean(settings.sms_enabled));
      setTelegramEnabled(Boolean(settings.telegram_enabled));
      setTelegramBotToken(settings.telegram_bot_token || '');
      setTelegramChatId(settings.telegram_chat_id || '');
    }
  }, [settings]);

  useEffect(() => {
    api.getSystemStatus().then((res) => {
      if (res.success) setSystemStatus(res.system);
    }).catch(() => {});
  }, []);

  const handleTestTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      alert('Please enter and save both Telegram Bot Token and Chat ID first.');
      return;
    }
    setTelegramTestStatus('Dispatching test message to your Telegram bot...');
    try {
      const res = await api.testTelegram();
      setTelegramTestStatus(res.message || 'Telegram test message received on your device!');
      setTimeout(() => setTelegramTestStatus(null), 5000);
    } catch (err: any) {
      setTelegramTestStatus(`Error: ${err.message || 'Failed to dispatch Telegram message'}`);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const res = await api.updateSettings({
        gesture_enabled: gestureEnabled,
        voice_enabled: voiceEnabled,
        location_enabled: locationEnabled,
        gesture_threshold: gestureThreshold,
        emergency_phrases: emergencyPhrases,
        msg91_auth_key: msg91AuthKey,
        msg91_template_id: msg91TemplateId,
        sms_enabled: smsEnabled,
        telegram_enabled: telegramEnabled,
        telegram_bot_token: telegramBotToken.trim(),
        telegram_chat_id: telegramChatId.trim()
      });
      if (res.success) {
        onUpdate(res.settings);
        setSaveMessage('All emergency alert settings saved successfully!');
        const sys = await api.getSystemStatus();
        if (sys.success) setSystemStatus(sys.system);
        setTimeout(() => setSaveMessage(null), 3500);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 pb-5 border-b border-slate-800 mb-6">
          <Settings className="w-5 h-5 text-red-500" />
          <div>
            <h2 className="text-xl font-bold text-white">Application Settings</h2>
            <p className="text-xs text-slate-400">
              Customize detection sensitivity, active modules, and recognition phrases
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={gestureEnabled}
                onChange={(e) => setGestureEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-700 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">AI Gesture Detection</span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Enable webcam vision analysis for open-palm triggers
                </span>
              </div>
            </label>

            <label className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(e) => setVoiceEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-700 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">Voice Detection</span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Listen for emergency phrases in background
                </span>
              </div>
            </label>

            <label className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={locationEnabled}
                onChange={(e) => setLocationEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-700 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-semibold text-white block">GPS Location Sharing</span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Include Google Maps coordinates in SMS alert
                </span>
              </div>
            </label>
          </div>

          {/* Gesture Sensitivity Slider */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Gesture Frame Confirmation Threshold</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-2.5 py-0.5 bg-emerald-500/10 rounded">
                {gestureThreshold} consecutive frames (~{Math.round((gestureThreshold / 30) * 1000)}ms)
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={25}
              value={gestureThreshold}
              onChange={(e) => setGestureThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Fast Trigger (3 frames - higher sensitivity)</span>
              <span>Ultra-Safe (25 frames - zero false positives)</span>
            </div>
          </div>

          {/* Emergency Voice Phrases */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <label className="block text-sm font-semibold text-white mb-1">
              Emergency Voice Detection Phrases (comma-separated)
            </label>
            <input
              type="text"
              value={emergencyPhrases}
              onChange={(e) => setEmergencyPhrases(e.target.value)}
              placeholder="sos,help me,emergency"
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-red-500"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Any spoken phrase containing these keywords will initiate the 5-second countdown.
            </span>
          </div>

          {/* MSG91 Live Gateway Configuration & Mode Card */}
          <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">MSG91 Live SMS Gateway Settings</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                    smsEnabled && msg91AuthKey && msg91TemplateId
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      smsEnabled && msg91AuthKey && msg91TemplateId
                        ? 'bg-emerald-400 animate-pulse'
                        : 'bg-amber-400'
                    }`}
                  />
                  {smsEnabled && msg91AuthKey && msg91TemplateId
                    ? 'Live Carrier SMS Active'
                    : 'Simulation Mode (Safe Default)'}
                </span>
              </div>
            </div>

            {/* Explanation banner */}
            <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-1.5">
              <p>
                <strong className="text-white">Why guardians don&apos;t receive physical SMS in Simulation Mode:</strong> By default, live carrier SMS is disabled so you can test emergency triggers (manual, gesture, voice) and verify GPS coordinates without burning paid MSG91 wallet credits or encountering Indian TRAI DLT blocks.
              </p>
              <p className="text-slate-400 text-[11px]">
                To send actual cellular SMS to Indian phone numbers, toggle <strong>Enable Real Live SMS</strong> below and provide your MSG91 AuthKey and approved 19-digit DLT Template ID.
              </p>
            </div>

            {/* Enable Real Live SMS Switch */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-700 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Enable Real Live SMS (Dispatches to Indian Telecom Networks)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  When enabled, verified emergency alerts will be transmitted via MSG91 Flow API. Requires an active MSG91 balance and registered TRAI DLT Template.
                </span>
              </div>
            </label>

            {/* Inputs grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  MSG91 Flow AuthKey
                </label>
                <input
                  type="password"
                  value={msg91AuthKey}
                  onChange={(e) => setMsg91AuthKey(e.target.value)}
                  placeholder="e.g. 384812AbcdEfGh12345"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-red-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Found in MSG91 Dashboard under API Keys &gt; AuthKey.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  MSG91 Flow Template ID
                </label>
                <input
                  type="text"
                  value={msg91TemplateId}
                  onChange={(e) => setMsg91TemplateId(e.target.value)}
                  placeholder="e.g. 64b1f... or 19-digit DLT ID"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-red-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  The Flow Template ID mapped in your MSG91 campaign.
                </span>
              </div>
            </div>
          </div>

          {/* TELEGRAM EMERGENCY BOT CARD (ZERO DLT ALTERNATIVE) */}
          <div className="p-5 bg-slate-950 rounded-xl border border-sky-800/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">
                  TG
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">Telegram Cloud Emergency Bot</span>
                  <span className="text-[11px] text-sky-400">100% Free · Zero Indian DLT Registration · Instant Phone Push</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                    telegramEnabled && telegramBotToken && telegramChatId
                      ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      telegramEnabled && telegramBotToken && telegramChatId
                        ? 'bg-sky-400 animate-pulse'
                        : 'bg-slate-600'
                    }`}
                  />
                  {telegramEnabled && telegramBotToken && telegramChatId ? 'Telegram Bot Active' : 'Not Active'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-sky-950/20 rounded-lg border border-sky-800/30 text-xs text-sky-200 leading-relaxed space-y-1">
              <p>
                <strong>The Ultimate Alternative to Indian SMS:</strong> Telecom networks in India block automated SMS without complex company registration and paid sender IDs. Telegram bots dispatch alerts with live Google Maps links directly to your guardian&apos;s phone in milliseconds at <strong>zero cost</strong>.
              </p>
            </div>

            {/* Telegram Enable Switch */}
            <label className="flex items-start gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
                className="mt-1 rounded border-slate-700 text-sky-500 focus:ring-sky-500"
              />
              <div>
                <span className="text-xs font-bold text-white block">
                  Enable Telegram Emergency Bot Push Dispatch
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Automatically delivers an emergency alert message with your live GPS location to your Telegram account or family group.
                </span>
              </div>
            </label>

            {/* Telegram inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Telegram Bot Token (from @BotFather)
                </label>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder="e.g. 7123456789:AAHk..."
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Obtained by messaging @BotFather on Telegram.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Telegram Chat ID (Your ID or Group ID)
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="e.g. 123456789 or -100123456789"
                  className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Obtained by messaging @userinfobot on Telegram.
                </span>
              </div>
            </div>

            {/* Test Telegram button & 30-sec instructions */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={Boolean(telegramTestStatus)}
                className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-lg transition-colors cursor-pointer self-start"
              >
                <span>{telegramTestStatus || 'Test Telegram Alert Now'}</span>
              </button>

              <span className="text-[11px] text-slate-400">
                Tip: Send a greeting to your bot once so it has permission to message you.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveMessage ? (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> {saveMessage}
              </span>
            ) : (
              <span />
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Indian DLT & MSG91 Compliance Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 pb-5 border-b border-slate-800 mb-6">
          <Smartphone className="w-5 h-5 text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">MSG91 Flow SMS & Indian TRAI DLT Guide</h2>
            <p className="text-xs text-slate-400">
              Regulatory compliance specifications for transmitting emergency SMS in India
            </p>
          </div>
        </div>

        {/* Current Provider Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 block mb-1">API Provider</span>
            <span className="font-bold text-white text-sm">MSG91 Flow API v5</span>
            <span className="text-[11px] text-slate-400 block mt-1">Official REST integration</span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 block mb-1">Credentials Status</span>
            <span className="font-bold text-sm text-slate-200">
              {systemStatus?.sms_configured ? (
                <span className="text-emerald-400">Configured (AuthKey + Template)</span>
              ) : (
                <span className="text-amber-400">Development / Test Mode Active</span>
              )}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1">
              {systemStatus?.sms_enabled ? 'Real SMS Dispatches Enabled' : 'Simulation Mode (Safe for Review)'}
            </span>
          </div>

          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-500 block mb-1">Endpoint</span>
            <span className="font-mono text-slate-300 text-[11px] break-all block">
              control.msg91.com/api/v5/flow/
            </span>
          </div>
        </div>

        {/* TRAI DLT Requirements Steps */}
        <div className="space-y-4 text-xs text-slate-300">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-400" />
            Mandatory Indian TRAI DLT Steps for Production Deployment:
          </h3>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 leading-relaxed">
            <div>
              <strong className="text-white block mb-0.5">1. Principal Entity Registration</strong>
              <p className="text-slate-400">
                Under Telecom Regulatory Authority of India (TRAI) directives, register your entity on an approved DLT portal (e.g., VilPower, Jio DLT, or Airtel DLT) and obtain a 19-digit Principal Entity ID.
              </p>
            </div>

            <div>
              <strong className="text-white block mb-0.5">2. Sender Header (Header ID) Approval</strong>
              <p className="text-slate-400">
                Register a 6-character alphabetic header matching your brand (e.g., <code className="text-red-400 font-mono">SOSGRD</code> or <code className="text-red-400 font-mono">EMRSOS</code>) under Service Implicit / Transactional category.
              </p>
            </div>

            <div>
              <strong className="text-white block mb-0.5">3. Approved Content Template Formulation</strong>
              <p className="text-slate-400 mb-2">
                Register the exact template string on your DLT portal with registered dynamic variables:
              </p>
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-200">
                SOS GUARDIAN - EMERGENCY ALERT: An emergency has been activated by &#123;#var#&#125;. Trigger: &#123;#var#&#125;. Time: &#123;#var#&#125;. Location: &#123;#var#&#125;. Please respond immediately.
              </div>
            </div>

            <div>
              <strong className="text-white block mb-0.5">4. MSG91 Flow Integration Mapping</strong>
              <p className="text-slate-400">
                Inside MSG91 Flow designer, create a Flow Campaign linked to the approved DLT Template ID and map the JSON variables: <code className="text-blue-400 font-mono">user_name</code>, <code className="text-blue-400 font-mono">trigger</code>, <code className="text-blue-400 font-mono">time</code>, and <code className="text-blue-400 font-mono">location_url</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ALTERNATIVE TECHNOLOGIES MATRIX (WHY ALTERNATIVES WIN FOR IMMEDIATE USE) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 pb-5 border-b border-slate-800 mb-6">
          <Shield className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Emergency Dispatch Technologies Compared</h2>
            <p className="text-xs text-slate-400">
              Pick the most reliable method to alert your trusted numbers without regulatory hurdles
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Technology</th>
                <th className="p-3">DLT Requirement</th>
                <th className="p-3">Cost</th>
                <th className="p-3">Reliability in India</th>
                <th className="p-3">Features</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 text-white font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  WhatsApp Instant Dispatch
                </td>
                <td className="p-3 text-emerald-400">Zero DLT</td>
                <td className="p-3 text-emerald-400">100% Free</td>
                <td className="p-3 text-emerald-400">Highest (&gt;99%)</td>
                <td className="p-3 text-slate-300">Pre-filled emergency SOS, Google Maps live link preview, 1-tap send</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 text-white font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  Telegram Emergency Bot
                </td>
                <td className="p-3 text-sky-400">Zero DLT</td>
                <td className="p-3 text-sky-400">100% Free</td>
                <td className="p-3 text-sky-400">Instant Push</td>
                <td className="p-3 text-slate-300">Automated server-to-phone cloud alerts, loud notifications, GPS coordinates</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 text-white font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  Direct Cellular Phone Call
                </td>
                <td className="p-3 text-blue-400">Zero DLT</td>
                <td className="p-3 text-blue-400">Standard Voice Plan</td>
                <td className="p-3 text-blue-400">Immediate Audio</td>
                <td className="p-3 text-slate-300">1-tap dialer triggers guardian&apos;s phone ringtone immediately</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 text-white font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  Native SIM SMS (P2P)
                </td>
                <td className="p-3 text-purple-400">Zero DLT (P2P)</td>
                <td className="p-3 text-purple-400">Free SMS pack</td>
                <td className="p-3 text-emerald-400">High (Carrier SIM)</td>
                <td className="p-3 text-slate-300">Bypasses commercial A2P filtering by dispatching directly from phone SIM</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 text-slate-400 font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  MSG91 Flow (Commercial A2P)
                </td>
                <td className="p-3 text-amber-400">Mandatory (19-digit DLT)</td>
                <td className="p-3 text-slate-400">Commercial Credits</td>
                <td className="p-3 text-slate-400">Telecom DLT Dependent</td>
                <td className="p-3 text-slate-300">Requires government TRAI entity registration and commercial sender approval</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
