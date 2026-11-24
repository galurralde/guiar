import React, { useEffect, useMemo, useRef, useState } from 'react';
import './style/guiar.css';
import {
  SUPPORTED_LANGUAGES,
  getDictionary,
  loadLanguage,
  saveLanguage,
} from './services/i18n';
import {
  clearTrailSession,
  loadBasePoint,
  loadBreadcrumbs,
  saveBasePoint,
  saveBreadcrumbs,
} from './services/storage';

const SAMPLE_TRAILS = [
  {
    id: 'san-bernardo-salta',
    province: 'Salta',
    name: 'Cerro San Bernardo · Sendero Principal',
    distanceKm: '2.4 km',
    elevationGain: '+280 m',
    difficulty: 'Moderada',
    status: 'Habilitado',
  },
  {
    id: 'serranias-hornocal-jujuy',
    province: 'Jujuy',
    name: 'Mirador del Hornocal · Tramo Alto',
    distanceKm: '4.1 km',
    elevationGain: '+420 m',
    difficulty: 'Exigente',
    status: 'Consultar parte',
  },
  {
    id: 'cerro-munoz-tucuman',
    province: 'Tucumán',
    name: 'Quebrada & Sendero de Altura · NOA',
    distanceKm: '5.6 km',
    elevationGain: '+510 m',
    difficulty: 'Exigente',
    status: 'Habilitado',
  },
];

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function formatDistance(meters) {
  if (meters == null || Number.isNaN(meters)) return '--';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function classifySignalQuality(accuracyMeters) {
  if (accuracyMeters == null || Number.isNaN(accuracyMeters)) return 'Sin dato';
  if (accuracyMeters <= 15) return `Óptima (±${Math.round(accuracyMeters)} m)`;
  if (accuracyMeters <= 25) return `Aceptable (±${Math.round(accuracyMeters)} m)`;
  return `Baja / Quebrada (±${Math.round(accuracyMeters)} m)`;
}

export default function App() {
  const [lang, setLang] = useState(() => loadLanguage());
  const t = useMemo(() => getDictionary(lang), [lang]);

  const [activeTab, setActiveTab] = useState('inicio');
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [currentPos, setCurrentPos] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [heading, setHeading] = useState(0);
  const [basePoint, setBasePoint] = useState(() => loadBasePoint());
  const [breadcrumbs, setBreadcrumbs] = useState(() => loadBreadcrumbs());
  const [cameraActive, setCameraActive] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [provinceFilter, setProvinceFilter] = useState('Todas');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    saveLanguage(lang);
  }, [lang]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Geolocalización y registro de hitos cada ~15 m sin descartar puntos en zonas difíciles
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocalización no disponible en este dispositivo.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError('');
        const nextPoint = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          timestamp: pos.timestamp || Date.now(),
        };
        setCurrentPos(nextPoint);

        setBreadcrumbs((prev) => {
          if (!prev.length) return prev;
          const last = prev[prev.length - 1];
          const moved = haversineMeters(last.lat, last.lon, nextPoint.lat, nextPoint.lon);
          if (moved >= 15) {
            const updated = [...prev, nextPoint];
            saveBreadcrumbs(updated);
            return updated;
          }
          return prev;
        });
      },
      (err) => {
        setGpsError(err.message || 'No se pudo obtener posición GPS.');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Brújula / orientación del dispositivo
  useEffect(() => {
    const handleOrientation = (event) => {
      if (typeof event.webkitCompassHeading === 'number') {
        setHeading(event.webkitCompassHeading);
        return;
      }
      if (event.absolute && typeof event.alpha === 'number') {
        setHeading((360 - event.alpha) % 360);
      } else if (typeof event.alpha === 'number') {
        setHeading((360 - event.alpha) % 360);
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // Control de cámara RA / Modo Ahorro
  useEffect(() => {
    let cancelled = false;

    async function toggleCamera() {
      if (cameraActive) {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraActive(false);
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
          if (cancelled) {
            stream.getTracks().forEach((tr) => tr.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch {
          if (!cancelled) setCameraActive(false);
        }
      } else if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    }

    toggleCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, [cameraActive]);

  const distanceToBase = useMemo(() => {
    if (!currentPos || !basePoint) return null;
    return haversineMeters(currentPos.lat, currentPos.lon, basePoint.lat, basePoint.lon);
  }, [currentPos, basePoint]);

  const bearingToBase = useMemo(() => {
    if (!currentPos || !basePoint) return null;
    return calculateBearing(currentPos.lat, currentPos.lon, basePoint.lat, basePoint.lon);
  }, [currentPos, basePoint]);

  const arrowRotation = useMemo(() => {
    if (bearingToBase == null) return 0;
    return ((bearingToBase - heading) % 360 + 360) % 360;
  }, [bearingToBase, heading]);

  const elevationDelta = useMemo(() => {
    if (
      currentPos?.alt == null ||
      basePoint?.alt == null ||
      Number.isNaN(currentPos.alt) ||
      Number.isNaN(basePoint.alt)
    ) {
      return '--';
    }
    const diff = Math.round(currentPos.alt - basePoint.alt);
    return `${diff >= 0 ? '+' : ''}${diff} m`;
  }, [currentPos, basePoint]);

  function handleSetBase() {
    if (!currentPos) return;
    const origin = { ...currentPos, savedAt: Date.now() };
    setBasePoint(origin);
    saveBasePoint(origin);
    const initialList = [origin];
    setBreadcrumbs(initialList);
    saveBreadcrumbs(initialList);
    window.alert(t.baseFixedAlert);
  }

  function handleResetTrail() {
    if (!window.confirm(t.resetConfirm)) return;
    clearTrailSession();
    setBasePoint(null);
    setBreadcrumbs([]);
    setCameraActive(false);
  }

  const filteredTrails = useMemo(() => {
    if (provinceFilter === 'Todas') return SAMPLE_TRAILS;
    return SAMPLE_TRAILS.filter((item) => item.province === provinceFilter);
  }, [provinceFilter]);

  const navItems = [
    { id: 'inicio', label: t.navInicio },
    { id: 'senderos', label: t.navSenderos },
    { id: 'retorno', label: t.navRetorno },
    { id: 'mochila', label: t.navMochila },
  ];

  return (
    <div className="guiar-shell">
      <header className="guiar-topbar">
        <div className="guiar-brand">
          <div>
            <div className="guiar-brand-title">GuiAR</div>
            <div className="guiar-brand-sub">{t.regionTag}</div>
          </div>
        </div>

        <div className="guiar-topbar-actions">
          <div className="guiar-lang-group" role="group" aria-label="Idioma">
            {SUPPORTED_LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code)}
                className={`guiar-lang-btn ${lang === item.code ? 'is-active' : ''}`}
                title={item.name}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="guiar-sos-pill"
            onClick={() => setSosModalOpen(true)}
          >
            {t.sosButton}
          </button>
        </div>
      </header>

      <div className="guiar-body">
        <aside className="guiar-sidebar" aria-label="Navegación principal">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`guiar-sidebar-btn ${activeTab === item.id ? 'is-active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </aside>

        <main className="guiar-main">
          {activeTab === 'inicio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <section className="guiar-card">
                <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, opacity: 0.75 }}>
                  {isOnline ? 'Conexión detectada' : 'Sin señal · Modo local activo'} ·{' '}
                  {classifySignalQuality(currentPos?.accuracy)}
                </p>
                <h1 style={{ margin: '0 0 8px', fontSize: 26 }}>{t.heroTitle}</h1>
                <p style={{ margin: '0 0 16px', lineHeight: 1.5 }}>{t.heroSubtitle}</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="guiar-btn-primary"
                    onClick={() => setActiveTab('retorno')}
                  >
                    {t.openRetorno}
                  </button>
                  <button
                    type="button"
                    className="guiar-btn-secondary"
                    onClick={() => setActiveTab('senderos')}
                  >
                    {t.openSenderos}
                  </button>
                </div>
              </section>

              <section className="guiar-grid-2">
                <div className="guiar-card">
                  <h2 style={{ margin: '0 0 6px', fontSize: 16 }}>Estado de travesía</h2>
                  <p style={{ margin: 0, fontSize: 14 }}>
                    Base: <strong>{basePoint ? 'Fijada' : 'Sin fijar'}</strong> ·{' '}
                    {t.waypointsLabel}:{' '}
                    <strong className="guiar-tabular">{breadcrumbs.length}</strong>
                  </p>
                </div>
                <div className="guiar-card">
                  <h2 style={{ margin: '0 0 6px', fontSize: 16 }}>Aviso de referencia</h2>
                  <p style={{ margin: 0, fontSize: 13 }}>{t.demoNotice}</p>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'senderos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <section className="guiar-card">
                <h1 style={{ margin: '0 0 10px', fontSize: 22 }}>{t.navSenderos} · NOA</h1>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Todas', 'Salta', 'Jujuy', 'Tucumán'].map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setProvinceFilter(prov)}
                      className={
                        provinceFilter === prov ? 'guiar-btn-primary' : 'guiar-btn-secondary'
                      }
                      style={{ minHeight: 40, padding: '8px 14px' }}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </section>

              <section className="guiar-grid-2">
                {filteredTrails.map((trail) => (
                  <article key={trail.id} className="guiar-card">
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.75 }}>
                      {trail.province} · {trail.status}
                    </div>
                    <h2 style={{ margin: '6px 0 8px', fontSize: 17 }}>{trail.name}</h2>
                    <p
                      className="guiar-tabular"
                      style={{ margin: '0 0 12px', fontSize: 13 }}
                    >
                      Distancia: <strong>{trail.distanceKm}</strong> · Desnivel:{' '}
                      <strong>{trail.elevationGain}</strong> · Dificultad:{' '}
                      <strong>{trail.difficulty}</strong>
                    </p>
                    <button
                      type="button"
                      className="guiar-btn-secondary"
                      onClick={() => setActiveTab('retorno')}
                    >
                      {t.openRetorno}
                    </button>
                  </article>
                ))}
              </section>
            </div>
          )}

          {activeTab === 'retorno' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <section className="guiar-card-dark">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    GPS: {classifySignalQuality(currentPos?.accuracy)}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>
                    {isOnline ? 'Online' : 'Offline local'}
                  </span>
                </div>

                {gpsError && (
                  <p style={{ margin: '0 0 12px', color: '#FCA5A5', fontSize: 13 }}>
                    {gpsError}
                  </p>
                )}

                <div
                  style={{
                    position: 'relative',
                    minHeight: 240,
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: '#142227',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  {cameraActive && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.72,
                      }}
                    />
                  )}

                  <div
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 56,
                        lineHeight: 1,
                        transform: `rotate(${arrowRotation}deg)`,
                        transition: 'transform 120ms linear',
                        color: '#8CE026',
                        marginBottom: 8,
                      }}
                      aria-hidden="true"
                    >
                      ↑
                    </div>
                    <div className="guiar-tabular" style={{ fontSize: 30, fontWeight: 800 }}>
                      {basePoint ? formatDistance(distanceToBase) : 'Sin base'}
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
                      {t.distanceLabel}
                    </div>
                  </div>
                </div>

                <div
                  className="guiar-tabular"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 10,
                    marginBottom: 14,
                    fontSize: 13,
                  }}
                >
                  <div className="guiar-card" style={{ padding: 10 }}>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{t.headingLabel}</div>
                    <strong>{Math.round(heading)}°</strong>
                  </div>
                  <div className="guiar-card" style={{ padding: 10 }}>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{t.waypointsLabel}</div>
                    <strong>{breadcrumbs.length}</strong>
                  </div>
                  <div className="guiar-card" style={{ padding: 10 }}>
                    <div style={{ fontSize: 11, opacity: 0.75 }}>{t.elevationDelta}</div>
                    <strong>{elevationDelta}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="guiar-btn-primary"
                    onClick={handleSetBase}
                    disabled={!currentPos}
                  >
                    {t.setBase}
                  </button>
                  <button
                    type="button"
                    className="guiar-btn-secondary"
                    onClick={() => setCameraActive((prev) => !prev)}
                  >
                    {cameraActive ? t.cameraOn : t.cameraOff}
                  </button>
                  <button
                    type="button"
                    className="guiar-btn-secondary"
                    onClick={handleResetTrail}
                  >
                    {t.resetTrip}
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'mochila' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <section className="guiar-card">
                <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>{t.navMochila}</h1>
                <p style={{ margin: '0 0 12px', fontSize: 14 }}>
                  Estado de red: <strong>{isOnline ? 'En línea' : 'Sin señal (offline)'}</strong>
                </p>
                <p className="guiar-tabular" style={{ margin: '0 0 12px', fontSize: 14 }}>
                  Punto de partida guardado: <strong>{basePoint ? 'Sí' : 'No'}</strong> ·{' '}
                  {t.waypointsLabel}: <strong>{breadcrumbs.length}</strong>
                </p>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
                  Los hitos se guardan localmente en el dispositivo sin interrumpir el recorrido si
                  se corta la señal.
                </p>
              </section>
            </div>
          )}
        </main>
      </div>

      <nav className="guiar-bottom-nav" aria-label="Navegación móvil">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`guiar-nav-btn ${activeTab === item.id ? 'is-active' : ''}`}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {sosModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Asistencia SOS"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(15, 23, 26, 0.78)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div className="guiar-card" style={{ maxWidth: 420, width: '100%' }}>
            <h2 style={{ margin: '0 0 8px', color: 'var(--guiar-danger)' }}>
              {t.sosButton} · Referencia local
            </h2>
            <p className="guiar-tabular" style={{ margin: '0 0 12px', fontSize: 13 }}>
              {currentPos
                ? `Lat: ${currentPos.lat.toFixed(5)} · Lon: ${currentPos.lon.toFixed(5)} · ${classifySignalQuality(currentPos.accuracy)}`
                : 'Esperando lectura GPS actual...'}
            </p>
            <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.45 }}>
              Si no hay señal, mantené la calma, conservá batería y comunicá tus coordenadas a los
              canales oficiales o de emergencia apenas tengas cobertura.
            </p>
            <button
              type="button"
              className="guiar-btn-primary"
              onClick={() => setSosModalOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}