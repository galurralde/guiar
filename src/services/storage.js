const PREFIX = 'guiar_v1_';

export const STORAGE_KEYS = {
  BASE_POINT: `${PREFIX}base_point`,
  BREADCRUMBS: `${PREFIX}breadcrumbs`,
  THEME: `${PREFIX}theme`,
  LAST_INCIDENT_QUEUE: `${PREFIX}sos_queue`,
};

function safeReadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeWriteJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function loadBasePoint() {
  return safeReadJSON(STORAGE_KEYS.BASE_POINT, null);
}

export function saveBasePoint(point) {
  return safeWriteJSON(STORAGE_KEYS.BASE_POINT, point);
}

export function loadBreadcrumbs() {
  const data = safeReadJSON(STORAGE_KEYS.BREADCRUMBS, []);
  return Array.isArray(data) ? data : [];
}

export function saveBreadcrumbs(points) {
  return safeWriteJSON(STORAGE_KEYS.BREADCRUMBS, points);
}

export function clearTrailSession() {
  try {
    localStorage.removeItem(STORAGE_KEYS.BASE_POINT);
    localStorage.removeItem(STORAGE_KEYS.BREADCRUMBS);
    return true;
  } catch {
    return false;
  }
}