import { useMemo, useState } from 'react';
import {
  CATEGORIES, CATEGORY_BY_ID, PLACES, formatDistance, walkMinutes, type CategoryId, type Place,
} from '../data/nearby';

interface Props {
  activeCats: CategoryId[];
  setActiveCats: (c: CategoryId[]) => void;
  showRings: boolean;
  setShowRings: (v: boolean) => void;
  onPick: (p: Place) => void;
}

const nearest = (sub: string) => PLACES.find((p) => p.sub === sub);

const HIGHLIGHTS: { sub: string; label: string }[] = [
  { sub: 'mrt', label: 'MRT' },
  { sub: 'bus', label: 'Bus stop' },
  { sub: 'hawker', label: 'Hawker' },
  { sub: 'supermarket', label: 'Supermarket' },
  { sub: 'primary', label: 'Primary sch' },
  { sub: 'polyclinic', label: 'Polyclinic' },
];

const PAGE = 12;

/** List filter: everything shown, one category (`c:food`) or one sub-type (`s:food:hawker`). */
type Filter = string;

export default function NearbyPanel(p: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const pl of PLACES) c[pl.cat] = (c[pl.cat] ?? 0) + 1;
    return c;
  }, []);

  // What's listed is exactly what's on the map (optionally narrowed by the filter).
  const list = useMemo(() => {
    const [kind, cat, sub] = filter.split(':');
    return PLACES.filter((pl) => p.activeCats.includes(pl.cat)
      && (kind === 'all' || (pl.cat === cat && (kind === 'c' || pl.sub === sub))));
  }, [p.activeCats, filter]);

  const toggleCat = (id: CategoryId) => {
    const on = p.activeCats.includes(id);
    p.setActiveCats(on ? p.activeCats.filter((c) => c !== id) : [...p.activeCats, id]);
    if (on && filter !== 'all' && filter.split(':')[1] === id) setFilter('all');
    setLimit(PAGE);
  };

  const pick = (pl: Place) => {
    if (!p.activeCats.includes(pl.cat)) p.setActiveCats([...p.activeCats, pl.cat]);
    p.onPick(pl);
  };

  const shown = CATEGORIES.filter((c) => p.activeCats.includes(c.id));

  return (
    <section className="card nearby">
      <label className="field-label">Nearest essentials <span className="muted">walk</span></label>
      <div className="highlights">
        {HIGHLIGHTS.map(({ sub: s, label }) => {
          const pl = nearest(s);
          if (!pl) return null;
          return (
            <button key={s} className="hl" onClick={() => pick(pl)} title={`Show ${pl.name} on the map`}>
              <span className="hl-label">{label}</span>
              <b>{walkMinutes(pl.d)} min</b>
              <span className="hl-name">{pl.name.replace(/\s*\(\d+\)$/, '')}</span>
            </button>
          );
        })}
      </div>

      <label className="field-label">
        Show on map
        <span className="chip-actions">
          <button className="link" onClick={() => p.setActiveCats(CATEGORIES.map((c) => c.id))}>All</button>
          <button className="link" onClick={() => { p.setActiveCats([]); setFilter('all'); }}>None</button>
        </span>
      </label>
      <div className="cat-chips">
        {CATEGORIES.map((c) => {
          const on = p.activeCats.includes(c.id);
          return (
            <button key={c.id} className={`cat-chip${on ? ' on' : ''}`} aria-pressed={on}
              style={{ ['--c' as string]: c.color }} onClick={() => toggleCat(c.id)}>
              <span>{c.icon}</span>{c.label}<em>{counts[c.id] ?? 0}</em>
            </button>
          );
        })}
      </div>

      {shown.length > 0 && (
        <div className="list-head">
          <b>{list.length} places</b>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setLimit(PAGE); }}>
            <option value="all">All shown</option>
            {shown.map((c) => (
              <optgroup key={c.id} label={c.label}>
                <option value={`c:${c.id}`}>All {c.label.toLowerCase()}</option>
                {Object.entries(c.subs).map(([k, v]) => <option key={k} value={`s:${c.id}:${k}`}>{v}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      )}
      <ul className="place-list">
        {list.slice(0, limit).map((pl) => {
          const cat = CATEGORY_BY_ID[pl.cat];
          return (
            <li key={`${pl.sub}-${pl.name}-${pl.lat}`}>
              <button onClick={() => pick(pl)}>
                <span className="pl-icon" style={{ ['--c' as string]: cat.color }}>{cat.icon}</span>
                <span className="pl-main">
                  <span className="pl-name">{pl.name}</span>
                  <span className="pl-sub">
                    {cat.subs[pl.sub] ?? pl.sub}
                    {pl.routes ? ` · ${pl.routes}` : pl.cuisine ? ` · ${pl.cuisine}` : ''}
                  </span>
                </span>
                <span className="pl-dist">
                  <b>{formatDistance(pl.d)}</b>
                  <span>{walkMinutes(pl.d)} min</span>
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="muted small empty">Turn on a category above to see places.</li>}
        {shown.length > 0 && list.length === 0 && <li className="muted small empty">Nothing mapped nearby.</li>}
      </ul>
      {list.length > limit && (
        <button className="link more" onClick={() => setLimit(limit + PAGE)}>Show {Math.min(PAGE, list.length - limit)} more</button>
      )}

      <label className="toggle rings-toggle">
        <span>Distance rings (500 m · 1 km · 2 km)</span>
        <input type="checkbox" checked={p.showRings} onChange={(e) => p.setShowRings(e.target.checked)} />
        <i />
      </label>
      <div className="muted small">Walk times are estimates from straight-line distance. Data © OpenStreetMap.</div>
    </section>
  );
}
