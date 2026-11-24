import { useEffect, useRef, useState } from 'react';
import { calcularDistancia, calcularRumbo } from './utils/geo';
import { createTrackPoint } from './domain/models';
import {
  clearTrailSession,
  loadBasePoint,
  loadBreadcrumbs,
  saveBasePoint,
  saveBreadcrumbs,
} from './services/storage';
import { applyGuiarTheme } from './services/theme';
import {
  extractCompassHeading,
  shortestAngleDelta,
  smoothCompassAngle,
} from './services/sensors';

function App() {
  const [puntoPartida, setPuntoPartida] = useState(null);
  const [posicionActual, setPosicionActual] = useState(null);
  const [distancia, setDistancia] = useState(null);
  const [rumbo, setRumbo] = useState(null);
  const [errorGps, setErrorGps] = useState(null);
  const [modoCamara, setModoCamara] = useState(false);
  const [migajas, setMigajas] = useState([]);
  const [brujulaGrados, setBrujulaGrados] = useState(0);

  const brujulaFiltrada = useRef(0);
  const betaFiltrado = useRef(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    applyGuiarTheme();

    const baseGuardada = loadBasePoint();
    if (baseGuardada) {
      setPuntoPartida(baseGuardada);
    }

    const migajasGuardadas = loadBreadcrumbs();
    if (migajasGuardadas.length > 0) {
      setMigajas(migajasGuardadas);
    }
  }, []);

  const registrarPuntoPartida = () => {
    setErrorGps(null);
    if (!navigator.geolocation) {
      setErrorGps('Tu navegador no soporta GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord = createTrackPoint({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          label: 'BASE',
          timestamp: pos.timestamp || Date.now(),
        });
        setPuntoPartida(coord);
        setMigajas([coord]);
        saveBasePoint(coord);
        saveBreadcrumbs([coord]);
        alert('¡Base de retorno fijada!');
      },
      (err) => setErrorGps('Error de GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!puntoPartida) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setErrorGps(null);
        const actual = createTrackPoint({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          alt: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp || Date.now(),
        });
        setPosicionActual(actual);

        const dist = calcularDistancia(actual.lat, actual.lon, puntoPartida.lat, puntoPartida.lon);
        const rum = calcularRumbo(actual.lat, actual.lon, puntoPartida.lat, puntoPartida.lon);

        setDistancia(dist.toFixed(3));
        setRumbo(rum);

        setMigajas((prevMigajas) => {
          if (prevMigajas.length === 0) {
            const inicial = [{ ...actual, label: 'BASE' }];
            saveBreadcrumbs(inicial);
            return inicial;
          }

          const ultimaMigaja = prevMigajas[prevMigajas.length - 1];
          const distALastMigaja = calcularDistancia(
            actual.lat,
            actual.lon,
            ultimaMigaja.lat,
            ultimaMigaja.lon
          );

          if (distALastMigaja > 0.015) {
            const nuevoHito = {
              ...actual,
              label: `PUNTO ${prevMigajas.length}`,
            };
            const nuevasMigajas = [...prevMigajas, nuevoHito];
            saveBreadcrumbs(nuevasMigajas);
            return nuevasMigajas;
          }
          return prevMigajas;
        });
      },
      (err) => setErrorGps('Error de GPS: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [puntoPartida]);

  useEffect(() => {
    const manejarOrientacion = (event) => {
      const headingRaw = extractCompassHeading(event);
      if (headingRaw !== null) {
        const suavizada = smoothCompassAngle(brujulaFiltrada.current, headingRaw, 0.22);
        brujulaFiltrada.current = suavizada;
        setBrujulaGrados(suavizada);
      }

      if (typeof event.beta === 'number' && !Number.isNaN(event.beta)) {
        betaFiltrado.current += (event.beta - betaFiltrado.current) * 0.15;
      }
    };

    window.addEventListener('deviceorientation', manejarOrientacion, true);
    return () => window.removeEventListener('deviceorientation', manejarOrientacion, true);
  }, []);

  useEffect(() => {
    async function activarCamara() {
      if (modoCamara) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: 'environment' } },
            audio: false,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            streamRef.current = stream;
          }
        } catch {
          try {
            const fallback = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            if (videoRef.current) {
              videoRef.current.srcObject = fallback;
              streamRef.current = fallback;
            }
          } catch {
            setModoCamara(false);
            setErrorGps('No se pudo iniciar la cámara; continuás en modo ahorro.');
          }
        }
      } else if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    activarCamara();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [modoCamara]);

  const rotacionMiniBrujula = rumbo !== null ? shortestAngleDelta(rumbo, brujulaGrados) : 0;
  const deltaAltitud =
    posicionActual?.alt !== null &&
    posicionActual?.alt !== undefined &&
    puntoPartida?.alt !== null &&
    puntoPartida?.alt !== undefined
      ? (posicionActual.alt - puntoPartida.alt).toFixed(0)
      : null;

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        backgroundColor: modoCamara ? 'transparent' : 'var(--guiar-dark, #0F171A)',
        color: '#F6F8F7',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {modoCamara && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: -2,
          }}
        />
      )}

      <h1
        style={{
          fontSize: '24px',
          color: 'var(--guiar-accent, #8CE026)',
          margin: '5px 0',
          textShadow: modoCamara ? '0 2px 4px rgba(0,0,0,0.8)' : 'none',
        }}
      >
        GuiAR · Retorno Seguro
      </h1>

      {errorGps && (
        <div
          style={{
            backgroundColor: 'rgba(184, 50, 50, 0.2)',
            border: '1px solid var(--guiar-danger, #B83232)',
            color: '#FCA5A5',
            padding: '8px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            maxWidth: '320px',
            margin: '8px auto',
          }}
        >
          {errorGps}
        </div>
      )}

      {!puntoPartida ? (
        <div style={{ marginTop: '64px' }}>
          <button
            onClick={registrarPuntoPartida}
            style={{
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: 'bold',
              backgroundColor: 'var(--guiar-accent, #8CE026)',
              color: 'var(--guiar-primary, #14362E)',
              border: 'none',
              borderRadius: '16px',
              minHeight: '48px',
              cursor: 'pointer',
            }}
          >
            Fijar Punto de Partida
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setModoCamara(!modoCamara)}
            style={{
              padding: '12px 24px',
              margin: '10px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: modoCamara
                ? 'var(--guiar-danger, #B83232)'
                : 'var(--guiar-primary, #14362E)',
              color: '#FFFFFF',
              border: '1px solid rgba(140, 224, 38, 0.35)',
              borderRadius: '16px',
              minHeight: '48px',
              cursor: 'pointer',
            }}
          >
            {modoCamara ? 'Modo Ahorro (Sin Cámara)' : 'Activar Cámara RA'}
          </button>

          <div
            style={{
              backgroundColor: 'rgba(15, 23, 26, 0.88)',
              padding: '12px',
              borderRadius: '16px',
              maxWidth: '280px',
              margin: '12px auto',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <div style={{ fontSize: '13px', color: '#E2E8F0' }}>
              Rumbo actual: <b>{brujulaGrados.toFixed(0)}°</b>
            </div>
            <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
              A la base: <b>{distancia ? `${distancia} km` : 'Calculando...'}</b>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--guiar-accent, #8CE026)', marginTop: '4px' }}>
              Hitos guardados: <b>{migajas.length}</b>
              {deltaAltitud !== null ? ` · Desnivel: ${Number(deltaAltitud) >= 0 ? `+${deltaAltitud}` : deltaAltitud} m` : ''}
            </div>
          </div>

          <div
            style={{
              position: 'fixed',
              bottom: '28px',
              right: '28px',
              width: '78px',
              height: '78px',
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 23, 26, 0.92)',
              border: '2px solid var(--guiar-accent, #8CE026)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
            }}
          >
            <svg
              style={{
                width: '40px',
                height: '40px',
                transform: `rotate(${rotacionMiniBrujula}deg)`,
                fill: 'var(--guiar-accent, #8CE026)',
                transition: 'transform 0.1s linear',
              }}
              viewBox="0 0 24 24"
            >
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>

          <button
            onClick={() => {
              if (confirm('¿Borrar travesía actual?')) {
                clearTrailSession();
                setPuntoPartida(null);
                setPosicionActual(null);
                setDistancia(null);
                setRumbo(null);
                setMigajas([]);
                setModoCamara(false);
              }
            }}
            style={{
              backgroundColor: 'rgba(15, 23, 26, 0.75)',
              color: '#FCA5A5',
              border: '1px solid var(--guiar-danger, #B83232)',
              padding: '8px 14px',
              borderRadius: '16px',
              minHeight: '48px',
              fontSize: '12px',
              marginTop: '24px',
              cursor: 'pointer',
            }}
          >
            Reiniciar Travesía
          </button>
        </div>
      )}
    </div>
  );
}

export default App;