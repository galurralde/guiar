export const SYNC_STATUS = {
  LOCAL_ONLY: 'local_only',
  QUEUED: 'queued',
  SYNCED: 'synced',
};

export const TRAIL_STATES = [
  'Habilitado',
  'Habilitado con restricciones',
  'Requiere guía',
  'Temporalmente cerrado',
  'Pendiente de verificación',
];

export const DEFAULT_GUIAR_THEME = {
  institutionId: 'guiar-default',
  institutionName: 'GuiAR',
  primaryColor: '#14362E',
  secondaryColor: '#1E3A34',
  accentColor: '#8CE026',
  darkSurface: '#0F171A',
  lightBg: '#F6F8F7',
  cardBg: '#FFFFFF',
  textPrimary: '#203C34',
  textSecondary: '#596C65',
  dangerColor: '#B83232',
  warningColor: '#8A5700',
  successColor: '#216344',
  radius: '16px',
  minTouchTarget: '48px',
};

export function createTrackPoint({ lat, lon, alt = null, accuracy = null, label = null, timestamp = Date.now() }) {
  return {
    lat: Number(lat),
    lon: Number(lon),
    alt: alt === null || alt === undefined || Number.isNaN(Number(alt)) ? null : Number(alt),
    accuracy: accuracy === null || accuracy === undefined || Number.isNaN(Number(accuracy)) ? null : Number(accuracy),
    label,
    timestamp,
  };
}