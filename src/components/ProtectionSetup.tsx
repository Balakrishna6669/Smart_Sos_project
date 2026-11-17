import React, { useState, useEffect } from 'react';
import { Camera, Mic, MapPin, ShieldCheck, AlertCircle, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { captureCurrentLocation } from '../services/location';

interface ProtectionSetupProps {
  onPermissionChange?: () => void;
}

export const ProtectionSetup: React.FC<ProtectionSetupProps> = () => {
  const [cameraStatus, setCameraStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [micStatus, setMicStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [testingGps, setTestingGps] = useState<boolean>(false);
  const [lastCoords, setLastCoords] = useState<string | null>(null);

  // Check initial permissions
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const cam = await navigator.permissions.query({ name: 'camera' as any });
        setCameraStatus(cam.state as any);
        cam.onchange = () => setCameraStatus(cam.state as any);
      } catch {}

      try {
        const mic = await navigator.permissions.query({ name: 'microphone' as any });
        setMicStatus(mic.state as any);
        mic.onchange = () => setMicStatus(mic.state as any);
      } catch {}

      try {
        const geo = await navigator.permissions.query({ name: 'geolocation' as any });
        setLocationStatus(geo.state as any);
        geo.onchange = () => setLocationStatus(geo.state as any);
      } catch {}
    }
  };

  const requestCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraStatus('granted');
    } catch {
      setCameraStatus('denied');
    }
  };

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicStatus('granted');
    } catch {
      setMicStatus('denied');
    }
  };

  const requestLocation = async () => {
    setTestingGps(true);
    const res = await captureCurrentLocation();
    setTestingGps(false);
    if (res.coordinates) {
      setLocationStatus('granted');
      setLastCoords(`${res.coordinates.latitude.toFixed(5)}, ${res.coordinates.longitude.toFixed(5)}`);
    } else {
      setLocationStatus(res.status === 'denied' ? 'denied' : 'prompt');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <div className="pb-5 border-b border-slate-800 mb-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Emergency Protection Setup</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure browser permissions for multi-modal emergency detection. Manual SOS is always active regardless of permissions.
        </p>
      </div>

      {/* Permissions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Camera Permission Card */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Camera className="w-5 h-5" />
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  cameraStatus === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : cameraStatus === 'denied'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                {cameraStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                  </>
                ) : cameraStatus === 'denied' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Blocked
                  </>
                ) : (
                  'Not Granted'
                )}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">Camera Permission</h3>
            <p className="text-xs text-slate-400 mb-4">
              Required for real-time <strong>AI Hand Gesture Recognition</strong> (MediaPipe open-palm classifier). Vision processing runs strictly in your browser and is never stored on the server.
            </p>
          </div>

          <button
            onClick={requestCamera}
            className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
              cameraStatus === 'granted'
                ? 'bg-slate-800 text-slate-400 cursor-default'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {cameraStatus === 'granted' ? 'Camera Authorized' : 'Authorize Camera'}
          </button>
        </div>

        {/* Microphone Permission Card */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                <Mic className="w-5 h-5" />
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  micStatus === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : micStatus === 'denied'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                {micStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                  </>
                ) : micStatus === 'denied' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Blocked
                  </>
                ) : (
                  'Not Granted'
                )}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">Microphone Permission</h3>
            <p className="text-xs text-slate-400 mb-4">
              Required for continuous <strong>Voice Emergency Keyword Detection</strong> (&quot;SOS&quot;, &quot;Help me&quot;, &quot;Emergency&quot;). Speech is analyzed locally using Web Speech API.
            </p>
          </div>

          <button
            onClick={requestMic}
            className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
              micStatus === 'granted'
                ? 'bg-slate-800 text-slate-400 cursor-default'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {micStatus === 'granted' ? 'Microphone Authorized' : 'Authorize Microphone'}
          </button>
        </div>

        {/* Location Permission Card */}
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <MapPin className="w-5 h-5" />
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  locationStatus === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : locationStatus === 'denied'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                {locationStatus === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                  </>
                ) : locationStatus === 'denied' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5" /> Blocked
                  </>
                ) : (
                  'Not Granted'
                )}
              </span>
            </div>

            <h3 className="text-sm font-bold text-white mb-1">GPS Location Permission</h3>
            <p className="text-xs text-slate-400 mb-2">
              Required to calculate your current coordinates and embed the live Google Maps emergency link inside SMS messages sent to your emergency contacts.
            </p>
            {lastCoords && (
              <p className="text-[11px] font-mono text-emerald-400 mb-2">
                Last GPS: {lastCoords}
              </p>
            )}
          </div>

          <button
            onClick={requestLocation}
            disabled={testingGps}
            className={`w-full py-2 px-3 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              locationStatus === 'granted'
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {testingGps && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{testingGps ? 'Testing GPS...' : locationStatus === 'granted' ? 'Refresh GPS Test' : 'Authorize GPS'}</span>
          </button>
        </div>
      </div>

      {/* Safety Notice & Guarantees */}
      <div className="mt-6 p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">Browser-Based Protection Notice</p>
          <p className="text-slate-400 leading-relaxed">
            SOS Guardian runs in an active browser tab. To ensure continuous multi-modal detection, keep this tab open during periods where protection is desired. If camera or microphone permissions are unavailable or denied, <strong>the manual SOS button always functions with 100% availability</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
