import Dexie from 'dexie';

export const db = new Dexie('GuiarOfflineDB');

// Versión 1: sesiones/base, puntos de traza (breadcrumbs) y cola de sincronización por lotes
db.version(1).stores({
  sessions: 'id, startedAt, status',
  breadcrumbs: '++id, sessionId, timestamp, qualityTier, synced',
  syncQueue: '++id, type, createdAt, status, attempts',
});

export function getQualityTier(accuracyMeters) {
  if (accuracyMeters == null || Number.isNaN(accuracyMeters)) return 'unknown';
  if (accuracyMeters <= 15) return 'optimal';
  if (accuracyMeters <= 25) return 'acceptable';
  return 'degraded';
}

export async function saveSessionBase(sessionId, basePoint) {
  if (!sessionId || !basePoint) return;
  await db.sessions.put({
    id: sessionId,
    startedAt: basePoint.timestamp || Date.now(),
    status: 'active',
    basePoint,
  });
}

export async function getActiveSession(sessionId = 'default-trail') {
  return db.sessions.get(sessionId);
}

export async function recordBreadcrumb(sessionId, point, extra = {}) {
  if (!point) return null;
  const accuracy = point.accuracy ?? null;
  const record = {
    sessionId,
    lat: point.lat,
    lon: point.lon,
    alt: point.alt ?? null,
    accuracy,
    altitudeAccuracy: point.altitudeAccuracy ?? null,
    heading: point.heading ?? null,
    speed: point.speed ?? null,
    timestamp: point.timestamp || Date.now(),
    qualityTier: getQualityTier(accuracy),
    isOnlineAtCapture: extra.isOnline ?? true,
    synced: 0,
  };
  const id = await db.breadcrumbs.add(record);
  return { ...record, id };
}

export async function getSessionBreadcrumbs(sessionId = 'default-trail') {
  return db.breadcrumbs.where('sessionId').equals(sessionId).sortBy('timestamp');
}

export async function enqueueTelemetryBatch(payload, type = 'telemetry_batch') {
  return db.syncQueue.add({
    type,
    payload,
    createdAt: Date.now(),
    status: 'pending',
    attempts: 0,
  });
}

export async function getPendingSyncCount() {
  return db.syncQueue.where('status').equals('pending').count();
}

export async function markPendingQueueSynced() {
  const pending = await db.syncQueue.where('status').equals('pending').toArray();
  const ids = pending.map((item) => item.id);
  if (ids.length > 0) {
    await db.syncQueue.bulkUpdate(
      ids.map((id) => ({
        key: id,
        changes: { status: 'synced', syncedAt: Date.now() },
      }))
    );
  }
  await db.breadcrumbs.where('synced').equals(0).modify({ synced: 1 });
  return ids.length;
}

export async function clearSessionData(sessionId = 'default-trail') {
  await db.breadcrumbs.where('sessionId').equals(sessionId).delete();
  await db.sessions.delete(sessionId);
}