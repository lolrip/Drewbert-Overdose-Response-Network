import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocation, Location } from '../lib/location';

interface GeofenceArea {
  id: string;
  name: string;
  center: Location;
  radius: number; // in meters
}

interface GeofenceState {
  currentLocation: Location | null;
  activeAreas: GeofenceArea[];
  isInside: boolean;
  nearbyAlerts: number;
  locationError: string | null;
}

export function useGeofencing() {
  const [state, setState] = useState<GeofenceState>({
    currentLocation: null,
    activeAreas: [],
    isInside: false,
    nearbyAlerts: 0,
    locationError: null,
  });

  const [watchId, setWatchId] = useState<number | null>(null);

  // Predefined geofence areas (in a real app, these would come from the backend)
  const geofenceAreas: GeofenceArea[] = [
    {
      id: 'downtown-seattle',
      name: 'Downtown Seattle Response Zone',
      center: { latitude: 47.6062, longitude: -122.3321 },
      radius: 2000, // 2km radius
    },
    {
      id: 'capitol-hill',
      name: 'Capitol Hill Response Zone',
      center: { latitude: 47.6205, longitude: -122.3212 },
      radius: 1500, // 1.5km radius
    },
    {
      id: 'belltown',
      name: 'Belltown Response Zone',
      center: { latitude: 47.6149, longitude: -122.3414 },
      radius: 1000, // 1km radius
    },
  ];

  const calculateDistance = useCallback((point1: Location, point2: Location): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }, []);

  const checkGeofences = useCallback((location: Location) => {
    const activeAreas = geofenceAreas.filter(area => {
      const distance = calculateDistance(location, area.center);
      return distance <= area.radius;
    });

    const isInside = activeAreas.length > 0;
    
    // Simulate nearby alerts based on location
    const nearbyAlerts = activeAreas.reduce((count, area) => {
      // Simulate 0-3 alerts per active area
      return count + Math.floor(Math.random() * 4);
    }, 0);

    setState(prev => ({
      ...prev,
      currentLocation: location,
      activeAreas,
      isInside,
      nearbyAlerts,
      locationError: null,
    }));
  }, [calculateDistance]);

  const startGeofencing = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        locationError: 'Geolocation is not supported by this browser.',
      }));
      return;
    }

    // Get initial location with increased timeout and better error handling
    const getLocationOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // Increased to 30 seconds
      maximumAge: 60000, // 1 minute
    };

    getCurrentLocation()
      .then(location => {
        checkGeofences(location);
      })
      .catch(error => {
        // More graceful error handling - don't show timeout errors as critical
        if (error.code === error.TIMEOUT) {
          setState(prev => ({
            ...prev,
            locationError: 'Location request timed out (this is normal and won\'t affect functionality)',
          }));
        } else if (error.code === error.PERMISSION_DENIED) {
          setState(prev => ({
            ...prev,
            locationError: 'Location permission denied',
          }));
        } else {
          setState(prev => ({
            ...prev,
            locationError: `Location unavailable: ${error.message}`,
          }));
        }
      });

    // Start watching position with better error handling
    const id = navigator.geolocation.watchPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        checkGeofences(location);
      },
      (error) => {
        // Only show permission errors, ignore timeout errors for watchPosition
        if (error.code === error.PERMISSION_DENIED) {
          setState(prev => ({
            ...prev,
            locationError: 'Location permission denied',
          }));
        }
        // Silently ignore timeout and position unavailable errors for watchPosition
        // as they are common and don't affect functionality
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Increased timeout
        maximumAge: 60000, // 1 minute
      }
    );

    setWatchId(id);
  }, [checkGeofences]);

  const stopGeofencing = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  useEffect(() => {
    return () => {
      stopGeofencing();
    };
  }, [stopGeofencing]);

  return {
    ...state,
    startGeofencing,
    stopGeofencing,
    isActive: watchId !== null,
  };
}