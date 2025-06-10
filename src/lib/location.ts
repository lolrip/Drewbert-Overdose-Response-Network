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

export async function reverseGeocode(location: Location): Promise<GeocodeResult> {
  try {
    const response = await fetch(
      `${GEOCODE_BASE_URL}/reverse?lat=${location.latitude}&lon=${location.longitude}&api_key=${GEOCODE_API_KEY}&format=json`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response from geocoding API');
    }

    // Handle case where API returns an error object
    if (data.error) {
      throw new Error(`Geocoding API error: ${data.error}`);
    }

    // Ensure we have the required structure
    return {
      display_name: data.display_name || 'Unknown location',
      address: data.address || {},
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    
    // Return a fallback result instead of throwing
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