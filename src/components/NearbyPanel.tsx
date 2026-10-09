import { useMemo, useState } from 'react';
import {
  CATEGORIES, CATEGORY_BY_ID, PLACES, formatDistance, walkMinutes, type CategoryId, type Place,
} from '../data/nearby';

interface Props {
  activeCats: CategoryId[];
  setActiveCats: (c: CategoryId[]) => void;
  listCat: CategoryId;
  setListCat: (c: CategoryId) => void;
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

export default function NearbyPanel(p: Props) {
  const [sub, setSub] = useState<string>('all');
  const [limit, setLimit] = useState(PAGE);
  const cat = CATEGORY_BY_ID[p.listCat];

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const pl of PLACES) c[pl.cat] = (c[pl.cat] ?? 0) + 1;
    return c;
  }, []);

  const list = useMemo(
    () => PLACES.filter((pl) => pl.cat === p.listCat && (sub === 'all' || pl.sub === sub)),
    [p.listCat, sub],
  );

  const chooseCat = (id: CategoryId) => {
    const on = p.activeCats.includes(id);
    if (id === p.listCat && on) {
      p.setActiveCats(p.activeCats.filter((c) => c !== id)); // second click hides it
    } else {
      if (!on) p.setActiveCats([...p.activeCats, id]);
      p.setListCat(id);
      setSub('all');
      setLimit(PAGE);
    }
  };

  const pick = (pl: Place) => {
    if (!p.activeCats.includes(pl.cat)) p.setActiveCats([...p.activeCats, pl.cat]);
    p.onPick(pl);
  };

  return (
    <section className="card nearby">
      <label className="field-label">Nearest essentials</label>
      <div className="highlights">
        {HIGHLIGHTS.map(({ sub: s, label }) => {
          const pl = nearest(s);
          if (!pl) return null;
          return (
            <button key={s} className="hl" onClick={() => pick(pl)} title={pl.name}>
              <span className="hl-label">{label}</span>
              <b>{walkMinutes(pl.d)} min</b>
              <span className="hl-name">{pl.name.replace(/\s*\(\d+\)$/, '')}</span>
            </button>
          );
        })}
      </div>

      <label className="field-label">On the map</label>
      <div className="cat-chips">
        {CATEGORIES.map((c) => {
          const on = p.activeCats.includes(c.id);
          return (
            <button key={c.id} className={`cat-chip${on ? ' on' : ''}${p.listCat === c.id ? ' listing' : ''}`}
              style={{ ['--c' as string]: c.color }} onClick={() => chooseCat(c.id)}>
              <span>{c.icon}</span>{c.label}<em>{counts[c.id] ?? 0}</em>
            </button>
          );
        })}
      </div>

      <div className="list-head">
        <b style={{ color: cat.color }}>{cat.icon} {cat.label}</b>
        <select value={sub} onChange={(e) => { setSub(e.target.value); setLimit(PAGE); }}>
          <option value="all">All types</option>
          {Object.entries(cat.subs).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <ul className="place-list">
        {list.slice(0, limit).map((pl) => (
          <li key={`${pl.sub}-${pl.name}-${pl.lat}`} onClick={() => pick(pl)}>
            <div className="pl-main">
              <span className="pl-name">{pl.name}</span>
              <span className="pl-sub">
                {cat.subs[pl.sub] ?? pl.sub}
                {pl.routes ? ` · ${pl.routes}` : pl.cuisine ? ` · ${pl.cuisine}` : ''}
              </span>
            </div>
            <div className="pl-dist">
              <b>{formatDistance(pl.d)}</b>
              <span>{walkMinutes(pl.d)} min</span>
            </div>
          </li>
        ))}
        {list.length === 0 && <li className="muted small">Nothing mapped nearby.</li>}
      </ul>
      {list.length > limit && (
        <button className="more" onClick={() => setLimit(limit + PAGE)}>Show more ({list.length - limit})</button>
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
