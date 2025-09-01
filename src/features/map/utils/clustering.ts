import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ClusterPoint {
  id: string;
  latitude: number;
  longitude: number;
  data: any;
}

export interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  points: ClusterPoint[];
  count: number;
}

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Convert latitude/longitude to pixel coordinates
const latLonToPixel = (lat: number, lon: number, region: any): { x: number; y: number } => {
  const x =
    ((lon - region.longitude + region.longitudeDelta / 2) / region.longitudeDelta) * SCREEN_WIDTH;
  const y =
    ((region.latitude + region.latitudeDelta / 2 - lat) / region.latitudeDelta) * SCREEN_HEIGHT;
  return { x, y };
};

// Calculate pixel distance for clustering
const pixelDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Cluster points based on screen distance
export const clusterPoints = (
  points: ClusterPoint[],
  region: any,
  clusterRadius: number = 60
): (Cluster | ClusterPoint)[] => {
  if (!points.length) return [];

  const clustered: (Cluster | ClusterPoint)[] = [];
  const visited = new Set<string>();

  points.forEach((point) => {
    if (visited.has(point.id)) return;

    const pointPixel = latLonToPixel(point.latitude, point.longitude, region);
    const cluster: ClusterPoint[] = [point];
    visited.add(point.id);

    // Find all points within cluster radius
    points.forEach((otherPoint) => {
      if (visited.has(otherPoint.id)) return;

      const otherPixel = latLonToPixel(otherPoint.latitude, otherPoint.longitude, region);
      const distance = pixelDistance(pointPixel, otherPixel);

      if (distance <= clusterRadius) {
        cluster.push(otherPoint);
        visited.add(otherPoint.id);
      }
    });

    if (cluster.length > 1) {
      // Create cluster
      const avgLat = cluster.reduce((sum, p) => sum + p.latitude, 0) / cluster.length;
      const avgLon = cluster.reduce((sum, p) => sum + p.longitude, 0) / cluster.length;

      clustered.push({
        id: `cluster-${cluster.map((p) => p.id).join('-')}`,
        latitude: avgLat,
        longitude: avgLon,
        points: cluster,
        count: cluster.length,
      });
    } else {
      // Single point
      clustered.push(point);
    }
  });

  return clustered;
};

// Get appropriate zoom level for a cluster
export const getClusterZoom = (cluster: Cluster, currentRegion: any): any => {
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLon = Infinity,
    maxLon = -Infinity;

  cluster.points.forEach((point) => {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLon = Math.min(minLon, point.longitude);
    maxLon = Math.max(maxLon, point.longitude);
  });

  const latDelta = Math.max(0.01, (maxLat - minLat) * 1.5);
  const lonDelta = Math.max(0.01, (maxLon - minLon) * 1.5);

  return {
    latitude: cluster.latitude,
    longitude: cluster.longitude,
    latitudeDelta: latDelta,
    longitudeDelta: lonDelta,
  };
};
