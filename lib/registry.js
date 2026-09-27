// Lista surselor de date. Ordinea contează doar pentru afișare.
import ro from './sources/ro.js';
import md from './sources/md.js';
import fr from './sources/fr.js';
import es from './sources/es.js';
import pt from './sources/pt.js';
import it from './sources/it.js';
import de from './sources/de.js';
import at from './sources/at.js';
import si from './sources/si.js';
import hr from './sources/hr.js';
import osm from './sources/osm.js';

export const ALL_SOURCES = [ro, md, fr, es, pt, it, de, at, si, hr, osm];

export function isEnabled(src, env) {
  return !src.enabled || src.enabled(env);
}

export function enabledSources(env) {
  return ALL_SOURCES.filter((s) => isEnabled(s, env));
}

/** Țările unde avem o sursă cu (aproape) toate benzinăriile și prețurile lor. */
export function completeCountries(env) {
  return new Set(enabledSources(env).filter((s) => s.complete && s.cc).map((s) => s.cc));
}

export function findSource(id, env) {
  const s = ALL_SOURCES.find((x) => x.id === id);
  return s && isEnabled(s, env) ? s : null;
}
