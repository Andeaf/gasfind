// În ce țară cade un punct? (contururi Natural Earth simplificate, vezi scripts/build-countries.js)
let COUNTRIES;
async function load() {
  COUNTRIES ||= (await import('./data/countries.js')).default;
  return COUNTRIES;
}

/** Punct în inel (listă plată [x0,y0,x1,y1,...]), algoritmul razei. */
function inRing(x, y, r) {
  let inside = false;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPoly(x, y, poly) {
  if (!inRing(x, y, poly[0])) return false;
  for (let k = 1; k < poly.length; k++) if (inRing(x, y, poly[k])) return false; // gaură
  return true;
}

function inCountry(c, lat, lng) {
  const [w, s, e, n] = c.bbox;
  if (lng < w || lng > e || lat < s || lat > n) return false;
  return c.polys.some((p) => inPoly(lng, lat, p));
}

/** Distanța aproximativă (km) de la punct la conturul unei țări. */
function distToCountryKm(c, lat, lng) {
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180), ky = 110.57;
  let best = Infinity;
  for (const poly of c.polys) {
    for (const r of poly) {
      for (let i = 0; i + 3 < r.length; i += 2) {
        const ax = (r[i] - lng) * kx, ay = (r[i + 1] - lat) * ky;
        const bx = (r[i + 2] - lng) * kx, by = (r[i + 3] - lat) * ky;
        const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
        let t = len2 ? -(ax * dx + ay * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const px = ax + t * dx, py = ay + t * dy;
        const d = px * px + py * py;
        if (d < best) best = d;
      }
    }
  }
  return Math.sqrt(best);
}

export async function countryAt(lat, lng) {
  const list = await load();
  for (const c of list) if (inCountry(c, lat, lng)) return c.cc;
  return null;
}

/**
 * Filtru pentru benzinăriile OSM (fără preț): le arătăm doar unde nu avem o sursă completă.
 * Într-o țară cu sursă completă păstrăm totuși stațiile aflate la < `borderKm` de o țară
 * fără sursă completă (conturul simplificat poate greși cu câteva sute de metri la graniță).
 */
export async function makeOsmFilter(completeSet, borderKm = 2) {
  const list = await load();
  const incomplete = list.filter((c) => !completeSet.has(c.cc));
  const padLat = borderKm / 110;
  return (lat, lng) => {
    let cc = null;
    for (const c of list) if (inCountry(c, lat, lng)) { cc = c.cc; break; }
    if (!cc || !completeSet.has(cc)) return { keep: true, cc };
    const padLng = padLat / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    for (const c of incomplete) {
      const [w, s, e, n] = c.bbox;
      if (lng < w - padLng || lng > e + padLng || lat < s - padLat || lat > n + padLat) continue;
      if (distToCountryKm(c, lat, lng) <= borderKm) return { keep: true, cc };
    }
    return { keep: false, cc };
  };
}

/** Are sens să cerem OSM pentru dala asta? (atinge vreo țară fără sursă completă?) */
export async function tileTouchesIncomplete([w, s, e, n], completeSet) {
  const list = await load();
  const steps = 6;
  for (let j = 0; j <= steps; j++) {
    for (let i = 0; i <= steps; i++) {
      const lat = s + ((n - s) * j) / steps, lng = w + ((e - w) * i) / steps;
      for (const c of list) {
        if (inCountry(c, lat, lng)) { if (!completeSet.has(c.cc)) return true; break; }
      }
    }
  }
  // granițe care trec printre punctele de mai sus: vreun vârf de contur în dală?
  for (const c of list) {
    if (completeSet.has(c.cc)) continue;
    const [cw, cs, ce, cn] = c.bbox;
    if (ce < w || cw > e || cn < s || cs > n) continue;
    for (const poly of c.polys) {
      const r = poly[0];
      for (let i = 0; i < r.length; i += 2) {
        if (r[i] >= w && r[i] <= e && r[i + 1] >= s && r[i + 1] <= n) return true;
      }
    }
  }
  return false;
}
