const GEOCODE_API_KEY = '6846e954d5860026750528mcs258121';
const GEOCODE_BASE_URL = 'https://geocode.maps.co';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeocodeResult {
  display_name: string;
  address: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export async function getCurrentLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

// In src/lib/location.ts

const Maps_API_KEY = import.meta.env.VITE_Maps_API_KEY;
const Maps_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function reverseGeocode(location: Location): Promise<GeocodeResult> {
  try {
    const response = await fetch(
      `${Maps_BASE_URL}?latlng=${location.latitude},${location.longitude}&key=${Maps_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Google Geocoding API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error(`Geocoding API error: ${data.status} - ${data.error_message || 'No results found'}`);
    }

    // Google returns an array of results, the first is usually the most accurate
    const result = data.results[0];
    const addressComponents = result.address_components;

    const getAddressComponent = (type: string) => {
      return addressComponents.find((c: any) => c.types.includes(type))?.long_name || '';
    };

    // Construct a GeocodeResult compatible with the existing format
    return {
      display_name: result.formatted_address || 'Unknown location',
      address: {
        road: `${getAddressComponent('street_number')} ${getAddressComponent('route')}`.trim(),
        neighbourhood: getAddressComponent('neighborhood'),
        city: getAddressComponent('locality'),
        state: getAddressComponent('administrative_area_level_1'),
        postcode: getAddressComponent('postal_code'),
        country: getAddressComponent('country'),
      },
    };
  } catch (error) {
    console.error('Reverse geocoding with Google Maps failed:', error);
    
    // Fallback result remains the same
    return {
      display_name: `Location at ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      address: {
        city: 'Unknown City',
        state: 'Unknown State',
        country: 'Unknown Country',
      },
    };
  }
}

export function formatGeneralLocation(geocodeResult: GeocodeResult): string {
  const { address } = geocodeResult;
  const parts = [
    address.neighbourhood || address.suburb,
    address.city,
    address.state
  ].filter(Boolean);
  
  return parts.join(', ') || 'Unknown location';
}

export function formatPreciseLocation(geocodeResult: GeocodeResult): string {
  const { address } = geocodeResult;
  const parts = [
    address.road,
    address.neighbourhood || address.suburb,
    address.city,
    address.state,
    address.postcode
  ].filter(Boolean);
  
  return parts.join(', ') || geocodeResult.display_name;
}