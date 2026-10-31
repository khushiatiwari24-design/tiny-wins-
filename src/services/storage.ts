import { SavedRoute, UserSettings, NotificationItem } from '../types';
import { INITIAL_SAVED_ROUTES, DEMO_NOTIFICATIONS } from '../data/demoData';

const SAVED_ROUTES_KEY = 'crowdsense_saved_routes_v1';
const SETTINGS_KEY = 'crowdsense_settings_v1';
const RECENT_SEARCHES_KEY = 'crowdsense_recent_searches_v1';
const NOTIFICATIONS_KEY = 'crowdsense_notifications_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  defaultCity: 'Mumbai',
  preferredMode: 'all',
  maxCrowdThreshold: 85,
  walkingSpeed: 'moderate',
  accessibilityPriority: false,
  monsoonMultiplier: 'normal',
  notificationsEnabled: true,
};

export function getSavedRoutes(): SavedRoute[] {
  try {
    const data = localStorage.getItem(SAVED_ROUTES_KEY);
    if (!data) {
      saveSavedRoutes(INITIAL_SAVED_ROUTES);
      return INITIAL_SAVED_ROUTES;
    }
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_SAVED_ROUTES;
  }
}

export function saveSavedRoutes(routes: SavedRoute[]): void {
  try {
    localStorage.setItem(SAVED_ROUTES_KEY, JSON.stringify(routes));
  } catch (e) {
    console.error('Failed to save routes to storage', e);
  }
}

export function addSavedRoute(route: SavedRoute): SavedRoute[] {
  const current = getSavedRoutes();
  const exists = current.some((r) => r.originId === route.originId && r.destinationId === route.destinationId);
  if (exists) {
    return current;
  }
  const updated = [route, ...current];
  saveSavedRoutes(updated);
  return updated;
}

export function removeSavedRoute(id: string): SavedRoute[] {
  const current = getSavedRoutes();
  const updated = current.filter((r) => r.id !== id);
  saveSavedRoutes(updated);
  return updated;
}

export function getSettings(): UserSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export interface RecentSearch {
  id: string;
  originId: string;
  destinationId: string;
  originName: string;
  destinationName: string;
  timestamp: string;
}

export function getRecentSearches(): RecentSearch[] {
  try {
    const data = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!data) {
      return [
        {
          id: 'rec-1',
          originId: 'borivali',
          destinationId: 'churchgate',
          originName: 'Borivali',
          destinationName: 'Churchgate',
          timestamp: 'Just now',
        },
        {
          id: 'rec-2',
          originId: 'thane',
          destinationId: 'csmt',
          originName: 'Thane',
          destinationName: 'CSMT',
          timestamp: '2 hours ago',
        },
      ];
    }
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function addRecentSearch(search: Omit<RecentSearch, 'id' | 'timestamp'>): void {
  try {
    const searches = getRecentSearches();
    const updated = [
      {
        ...search,
        id: `search-${Date.now()}`,
        timestamp: 'Just now',
      },
      ...searches.filter((s) => !(s.originId === search.originId && s.destinationId === search.destinationId)),
    ].slice(0, 5);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save recent search', e);
  }
}

export function getNotifications(): NotificationItem[] {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) {
      saveNotifications(DEMO_NOTIFICATIONS);
      return DEMO_NOTIFICATIONS;
    }
    return JSON.parse(data);
  } catch (e) {
    return DEMO_NOTIFICATIONS;
  }
}

export function saveNotifications(notifications: NotificationItem[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Failed to save notifications', e);
  }
}

export function markNotificationAsRead(id: string): NotificationItem[] {
  const current = getNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, unread: false } : n));
  saveNotifications(updated);
  return updated;
}
