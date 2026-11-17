import React, { useEffect, useState } from 'react';
import { emergencyEngine, SOSStateSnapshot } from '../services/emergency';
import { sound } from '../services/audio';
import { api } from '../services/api';
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  Volume2,
  VolumeX,
  MapPin,
  ExternalLink,
  ShieldAlert,
  MessageSquare,
  PhoneCall,
  Send
} from 'lucide-react';

export const CountdownModal: React.FC = () => {
  const [snapshot, setSnapshot] = useState<SOSStateSnapshot>(emergencyEngine.getSnapshot());
  const [soundOn, setSoundOn] = useState<boolean>(sound.isSoundEnabled());
  const [primaryContact, setPrimaryContact] = useState<{ name: string; mobile: string } | null>(null);

  useEffect(() => {
    return emergencyEngine.subscribe(setSnapshot);
  }, []);

  useEffect(() => {
    if (snapshot.state === 'confirmed') {
      api.getContacts().then((res) => {
        if (res.success && res.contacts && res.contacts.length > 0) {
          setPrimaryContact({
            name: res.contacts[0].contact_name,
            mobile: res.contacts[0].mobile_number
          });
        }
      }).catch(() => {});
    }
  }, [snapshot.state]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    sound.setSoundEnabled(next);
  };

  if (snapshot.state === 'idle') {
    return null;
  }

  const progressPercent = ((5 - snapshot.secondsRemaining) / 5) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        {/* Top bar with sound control */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
            <ShieldAlert className="w-4 h-4 animate-pulse text-red-500" />
            <span>Emergency Dispatch System</span>
          </div>
          <button
            onClick={toggleSound}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white rounded-md bg-slate-800/80 transition-colors"
            title="Toggle Sound Effects"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
            <span>{soundOn ? 'Sound On' : 'Muted'}</span>
          </button>
        </div>

        {/* State: COUNTDOWN */}
        {snapshot.state === 'countdown' && (
          <div className="p-8 text-center">
            <div className="relative flex items-center justify-center w-36 h-36 mx-auto mb-6">
              {/* Circular SVG progress */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-red-600 transition-all duration-1000 ease-linear"
                  strokeWidth="8"
                  strokeDasharray={390}
                  strokeDashoffset={390 - (390 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-6xl font-extrabold tracking-tighter text-white tabular-nums">
                  {snapshot.secondsRemaining}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-400 mt-1">
                  Seconds
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">
              EMERGENCY SOS INITIATED
            </h3>
            
            <p className="text-sm text-slate-300 max-w-sm mx-auto mb-2">
              Activation source: <strong className="text-red-400 uppercase">{snapshot.triggerType} detection</strong>.
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
              Capturing GPS coordinates and transmitting emergency SMS to registered contacts via MSG91 upon countdown completion.
            </p>

            <button
              onClick={() => emergencyEngine.cancelSOS()}
              className="w-full py-4 px-6 text-base font-bold uppercase tracking-wide text-white bg-slate-800 hover:bg-slate-700 border-2 border-red-500 hover:border-red-400 rounded-xl transition-all shadow-lg hover:shadow-red-500/20 active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                CANCEL SOS (I AM SAFE)
              </span>
            </button>
          </div>
        )}

        {/* State: DISPATCHING */}
        {snapshot.state === 'dispatching' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <h3 className="text-xl font-bold text-white mb-2">Transmitting Emergency Signal...</h3>
            <p className="text-sm text-slate-300">
              Acquiring high-accuracy GPS coordinates and dispatching SMS alerts via MSG91 Flow API.
            </p>
          </div>
        )}

        {/* State: CONFIRMED */}
        {snapshot.state === 'confirmed' && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">EMERGENCY SOS TRANSMITTED</h3>
            <p className="text-sm text-emerald-400 font-medium mb-4">
              Successfully alerted {snapshot.notifiedCount} emergency contacts via MSG91 SMS!
            </p>

            {snapshot.lastConfirmedEvent && (
              <div className="text-left bg-slate-950/80 rounded-xl p-4 border border-slate-800 mb-6 space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Event ID:</span>
                  <span className="font-mono text-slate-200">#{String(snapshot.lastConfirmedEvent.id).padStart(4, '0')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Trigger:</span>
                  <span className="font-semibold uppercase text-red-400">{snapshot.lastConfirmedEvent.trigger_type}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="font-mono text-slate-200">
                    {snapshot.lastConfirmedEvent.latitude && snapshot.lastConfirmedEvent.longitude
                      ? `${snapshot.lastConfirmedEvent.latitude.toFixed(5)}, ${snapshot.lastConfirmedEvent.longitude.toFixed(5)}`
                      : 'Approximate / Manual'}
                  </span>
                </div>
                {snapshot.lastConfirmedEvent.maps_url && (
                  <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      Live Map:
                    </span>
                    <a
                      href={snapshot.lastConfirmedEvent.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    >
                      Open Google Maps <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {primaryContact && (
              <div className="mb-6 p-4 bg-slate-950 rounded-xl border border-emerald-900/50 text-left space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    Instant Direct Alert (Zero DLT)
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded">
                    Guaranteed Delivery
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Alert <strong>{primaryContact.name}</strong> ({primaryContact.mobile}) immediately with your live GPS location:
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <a
                    href={`https://api.whatsapp.com/send?phone=${primaryContact.mobile.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(`🚨 *EMERGENCY SOS ALERT* 🚨\n\nI need urgent assistance!\n\n📍 *My Live GPS Location:* ${snapshot.lastConfirmedEvent?.maps_url || 'https://www.google.com/maps'}\n\nPlease check on me or call emergency services immediately!`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors text-center shadow-md cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${primaryContact.mobile}`}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-center shadow-md cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Phone</span>
                  </a>
                  <a
                    href={`sms:${primaryContact.mobile}${typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(`EMERGENCY SOS! I need help. My live GPS location: ${snapshot.lastConfirmedEvent?.maps_url || 'https://www.google.com/maps'}`)}`}
                    className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors text-center shadow-md cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Device SMS</span>
                  </a>
                </div>
              </div>
            )}

            <button
              onClick={() => emergencyEngine.resetToIdle()}
              className="w-full py-3 px-4 font-semibold text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Close & Return to Dashboard
            </button>
          </div>
        )}

        {/* State: CANCELLED */}
        {snapshot.state === 'cancelled' && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              <XCircle className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Emergency Cancelled</h3>
            <p className="text-sm text-slate-300 mb-2">
              The SOS countdown was stopped before transmission.
            </p>
            <p className="text-xs text-slate-500">
              No emergency SMS was dispatched to your contacts.
            </p>
          </div>
        )}

        {/* State: ERROR */}
        {snapshot.state === 'error' && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/40 text-red-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Dispatch Encountered an Issue</h3>
            <p className="text-sm text-red-300 mb-6">{snapshot.lastError}</p>
            <div className="flex gap-3">
              <button
                onClick={() => emergencyEngine.activateSOS(snapshot.triggerType || 'manual')}
                className="flex-1 py-3 px-4 font-semibold text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg"
              >
                Retry Dispatch
              </button>
              <button
                onClick={() => emergencyEngine.resetToIdle()}
                className="flex-1 py-3 px-4 font-semibold text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
