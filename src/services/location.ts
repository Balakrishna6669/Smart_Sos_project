import { LocationCoordinates } from '../types';

export interface LocationResult {
  coordinates: LocationCoordinates | null;
  mapsUrl: string;
  error: string | null;
  status: 'acquired' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';
}

/**
 * Captures user GPS coordinates using Browser Geolocation API.
 * Section 11 Compliance:
 * - High accuracy
 * - Timeout handling
 * - Permission denial handling
 * - Formats standard Google Maps URL
 */
export async function captureCurrentLocation(): Promise<LocationResult> {
  if (!navigator.geolocation) {
    return {
      coordinates: null,
      mapsUrl: 'Location unavailable',
      error: 'Geolocation is not supported by this browser.',
      status: 'unsupported',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

        resolve({
          coordinates: {
            latitude: lat,
            longitude: lng,
            accuracy,
            addressLabel: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (±${Math.round(accuracy)}m)`,
          },
          mapsUrl,
          error: null,
          status: 'acquired',
        });
      },
      (err) => {
        let status: LocationResult['status'] = 'unavailable';
        let message = 'Unable to retrieve location coordinates.';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            status = 'denied';
            message = 'Location access was denied in browser permissions. Please allow location access in your browser address bar.';
            break;
          case err.POSITION_UNAVAILABLE:
            status = 'unavailable';
            message = 'GPS position is currently unavailable.';
            break;
          case err.TIMEOUT:
            status = 'timeout';
            message = 'GPS location request timed out. Please check device location services.';
            break;
        }

        resolve({
          coordinates: null,
          mapsUrl: 'Location unavailable',
          error: message,
          status,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 15000,
      }
    );
  });
}
