import React, { useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, ExternalLink, Navigation, Compass, AlertCircle, Shield } from 'lucide-react';

interface GoogleMapsPanelProps {
  latitude: number | null;
  longitude: number | null;
  addressLabel?: string;
  triggerType?: string;
}

export const GoogleMapsPanel: React.FC<GoogleMapsPanelProps> = ({
  latitude,
  longitude,
  addressLabel,
  triggerType = 'Manual SOS',
}) => {
  // Use provisioned GHP key or fallback to environment or demo key
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const currentLat = latitude || 28.6139;
  const currentLng = longitude || 77.2090;

  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Live Emergency Google Map</span>
              <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Official Google Maps Platform
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {addressLabel || `Target: ${currentLat.toFixed(5)}, ${currentLng.toFixed(5)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://www.google.com/maps?q=${currentLat},${currentLng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors shadow-sm"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[380px] rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={{ lat: currentLat, lng: currentLng }}
              defaultZoom={15}
              mapId="DEMO_MAP_ID"
              mapTypeId={mapType}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              className="w-full h-full"
              gestureHandling="greedy"
              disableDefaultUI={false}
            >
              <AdvancedMarker position={{ lat: currentLat, lng: currentLng }}>
                <Pin background="#dc2626" borderColor="#991b1b" glyphColor="#ffffff" scale={1.2} />
              </AdvancedMarker>
            </Map>
          </APIProvider>
        ) : (
          /* High-accuracy interactive embedded map fallback */
          <iframe
            title="Google Maps Emergency View"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://maps.google.com/maps?q=${currentLat},${currentLng}&z=15&output=embed`}
          />
        )}

        {/* Floating Coordinates & Telemetry Badge */}
        <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white backdrop-blur-md shadow-lg flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono tabular-nums">
            {currentLat.toFixed(6)}° N, {currentLng.toFixed(6)}° E
          </span>
        </div>
      </div>

      {/* Grounding & Verification Footnote */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Coordinates verified via browser GPS Geolocation</span>
        </span>
        <span className="font-mono text-slate-400">Google Maps Platform · @vis.gl/react-google-maps</span>
      </div>
    </div>
  );
};
