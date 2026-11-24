const LANG_STORAGE_KEY = 'guiar_v1_lang';

// FR entra en 2027 según control de cambios acordado
export const SUPPORTED_LANGUAGES = [
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'pt', label: 'PT', name: 'Português' },
];

const TRANSLATIONS = {
  es: {
    regionTag: 'Salta, Jujuy y Tucumán · PWA Offline',
    navInicio: 'Inicio',
    navSenderos: 'Senderos',
    navRetorno: 'Retorno',
    navMochila: 'Mochila',
    sosButton: 'SOS',
    heroTitle: 'El NOA, a tu paso',
    heroSubtitle: 'Navegación offline, retorno seguro y registro local en zonas sin señal.',
    openRetorno: 'Ir a Retorno Seguro',
    openSenderos: 'Explorar senderos',
    setBase: 'Fijar Punto de Partida',
    baseFixedAlert: '¡Base de retorno fijada!',
    cameraOn: 'Modo Ahorro (Sin Cámara)',
    cameraOff: 'Activar Cámara RA',
    headingLabel: 'Rumbo actual',
    distanceLabel: 'A la base',
    waypointsLabel: 'Hitos guardados',
    elevationDelta: 'Desnivel',
    resetTrip: 'Reiniciar Travesía',
    resetConfirm: '¿Borrar travesía actual?',
    demoNotice: 'Datos de ejemplo y referencia visual. Confirmar condiciones con autoridad local.',
  },
  en: {
    regionTag: 'Salta, Jujuy & Tucumán · Offline PWA',
    navInicio: 'Home',
    navSenderos: 'Trails',
    navRetorno: 'Return',
    navMochila: 'Offline Kit',
    sosButton: 'SOS',
    heroTitle: 'NOA, at your pace',
    heroSubtitle: 'Offline navigation, safe return and local tracking in low-signal areas.',
    openRetorno: 'Open Safe Return',
    openSenderos: 'Explore trails',
    setBase: 'Set Starting Point',
    baseFixedAlert: 'Return base set!',
    cameraOn: 'Battery Saver (No Camera)',
    cameraOff: 'Enable AR Camera',
    headingLabel: 'Current heading',
    distanceLabel: 'To base',
    waypointsLabel: 'Saved waypoints',
    elevationDelta: 'Elevation delta',
    resetTrip: 'Reset Trail',
    resetConfirm: 'Delete current trail session?',
    demoNotice: 'Sample data and visual reference. Verify conditions with local authorities.',
  },
  pt: {
    regionTag: 'Salta, Jujuy e Tucumán · PWA Offline',
    navInicio: 'Início',
    navSenderos: 'Trilhas',
    navRetorno: 'Retorno',
    navMochila: 'Mochila',
    sosButton: 'SOS',
    heroTitle: 'O NOA, no seu ritmo',
    heroSubtitle: 'Navegação offline, retorno seguro e registro local em áreas sem sinal.',
    openRetorno: 'Ir para Retorno Seguro',
    openSenderos: 'Explorar trilhas',
    setBase: 'Fixar Ponto de Partida',
    baseFixedAlert: 'Base de retorno definida!',
    cameraOn: 'Modo Economia (Sem Câmera)',
    cameraOff: 'Ativar Câmera RA',
    headingLabel: 'Rumo atual',
    distanceLabel: 'Até a base',
    waypointsLabel: 'Marcos salvos',
    elevationDelta: 'Desnível',
    resetTrip: 'Reiniciar Trilha',
    resetConfirm: 'Apagar a trilha atual?',
    demoNotice: 'Dados de exemplo e referência visual. Confirme as condições com a autoridade local.',
  },
};

export function loadLanguage() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved && TRANSLATIONS[saved]) return saved;
  } catch {
    // ignorar fallo de almacenamiento
  }
  return 'es';
}

export function saveLanguage(lang) {
  try {
    if (TRANSLATIONS[lang]) {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    }
  } catch {
    // ignorar fallo de almacenamiento
  }
}

export function getDictionary(lang) {
  return TRANSLATIONS[lang] || TRANSLATIONS.es;
}