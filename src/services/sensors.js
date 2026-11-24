export function normalizeAngle360(deg) {
  const num = Number(deg);
  if (Number.isNaN(num)) return 0;
  return ((num % 360) + 360) % 360;
}

export function shortestAngleDelta(targetDeg, currentDeg) {
  const diff = normalizeAngle360(targetDeg) - normalizeAngle360(currentDeg);
  return ((diff + 180) % 360 + 360) % 360 - 180;
}

export function extractCompassHeading(event) {
  if (!event) return null;

  if (typeof event.webkitCompassHeading === 'number' && !Number.isNaN(event.webkitCompassHeading)) {
    return normalizeAngle360(event.webkitCompassHeading);
  }

  if (typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
    const beta = typeof event.beta === 'number' && !Number.isNaN(event.beta) ? event.beta : 0;
    const gamma = typeof event.gamma === 'number' && !Number.isNaN(event.gamma) ? event.gamma : 0;

    const alphaRad = (event.alpha * Math.PI) / 180;
    const betaRad = (beta * Math.PI) / 180;
    const gammaRad = (gamma * Math.PI) / 180;

    const cA = Math.cos(alphaRad);
    const sA = Math.sin(alphaRad);
    const sB = Math.sin(betaRad);
    const cG = Math.cos(gammaRad);
    const sG = Math.sin(gammaRad);

    const yH = -sA * cG - cA * sB * sG;
    const xH = -cA * cG + sA * sB * sG;

    let heading = (Math.atan2(yH, xH) * 180) / Math.PI;
    if (Math.abs(beta) < 35 && Math.abs(gamma) > 45) {
      heading += 90;
    }

    return normalizeAngle360(heading);
  }

  return null;
}

export function smoothCompassAngle(prevAngle, nextAngle, alphaFactor = 0.22) {
  const safePrev = normalizeAngle360(prevAngle);
  const safeNext = normalizeAngle360(nextAngle);
  const delta = shortestAngleDelta(safeNext, safePrev);
  return normalizeAngle360(safePrev + delta * alphaFactor);
}