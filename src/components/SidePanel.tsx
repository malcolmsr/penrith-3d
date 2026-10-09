import { BLOCKS, MY_UNIT, PROJECT, STACKS, STACK_COLORS, type BlockId } from '../data/penrith';
import type { Selection } from '../map/MapView';

interface Props {
  selection: Selection;
  onSelect: (s: Selection) => void;
  showContext: boolean;
  setShowContext: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  showPois: boolean;
  setShowPois: (v: boolean) => void;
  sunHour: number;
  setSunHour: (v: number) => void;
}

const fmtHour = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const ampm = hh >= 12 ? 'pm' : 'am';
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ampm}`;
};

export default function SidePanel(p: Props) {
  const { selection: sel, onSelect } = p;
  const stack = sel.stack ? STACKS.find((s) => s.id === sel.stack) : null;
  const isMine = sel.stack === MY_UNIT.stack && sel.floor === MY_UNIT.floor;

  return (
    <aside className="panel">
      <section className="card hero">
        <div className="eyebrow">{PROJECT.district}</div>
        <h1>{PROJECT.name}</h1>
        <div className="muted">{PROJECT.address}</div>
        <div className="stats">
          <div><b>{PROJECT.towers}</b><span>towers</span></div>
          <div><b>{PROJECT.storeys}</b><span>storeys</span></div>
          <div><b>{PROJECT.units}</b><span>units</span></div>
        </div>
        <div className="muted small">{PROJECT.tenure} · keys {PROJECT.vacantPossession}</div>
      </section>

      <section className="card mine" onClick={() => onSelect({ block: MY_UNIT.block, stack: MY_UNIT.stack, floor: MY_UNIT.floor })}>
        <span className="dot" />
        <div>
          <b>My unit · #{MY_UNIT.floor}-{MY_UNIT.stack}</b>
          <div className="muted small">Block {MY_UNIT.block} · Type {MY_UNIT.type} · {MY_UNIT.bedrooms} BR · {MY_UNIT.sqm} sqm</div>
        </div>
      </section>

      <section className="card">
        <label className="field-label">Block</label>
        <div className="seg">
          {BLOCKS.map((b) => (
            <button key={b.id} className={sel.block === b.id ? 'active' : ''}
              onClick={() => onSelect({ block: b.id as BlockId, stack: null, floor: null })}>
              Block {b.id}
            </button>
          ))}
          <button className={!sel.block ? 'active' : ''} onClick={() => onSelect({ block: null, stack: null, floor: null })}>All</button>
        </div>

        {sel.block && (
          <>
            <label className="field-label">Stack</label>
            <div className="stack-grid">
              {BLOCKS.find((b) => b.id === sel.block)!.stacks.map((s) => (
                <button key={s} className={sel.stack === s ? 'active' : ''} style={{ ['--c' as string]: STACK_COLORS[s] }}
                  onClick={() => onSelect({ block: sel.block, stack: sel.stack === s ? null : s, floor: null })}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {stack && (
          <>
            <label className="field-label">
              Floor <span className="muted">{sel.floor ? `#${String(sel.floor).padStart(2, '0')}-${stack.id}` : '—'}</span>
            </label>
            <input type="range" min={2} max={stack.topFloor} value={sel.floor ?? 2}
              onChange={(e) => onSelect({ ...sel, floor: Number(e.target.value) })} />
            <div className="muted small">
              Stack {stack.id} runs storeys 2–{stack.topFloor}{stack.topFloor === 39 ? ' (roof garden above)' : ''}
              {isMine && <> · <b className="pink">this is your unit</b></>}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <label className="field-label">Sun position <span className="muted">{fmtHour(p.sunHour)}</span></label>
        <input type="range" min={7} max={19} step={0.25} value={p.sunHour} onChange={(e) => p.setSunHour(Number(e.target.value))} />
        <div className="muted small">Lighting only — cast shadows come in phase 2.</div>
      </section>

      <section className="card toggles">
        <Toggle label="Surrounding buildings" on={p.showContext} set={p.setShowContext} />
        <Toggle label="Block labels" on={p.showLabels} set={p.setShowLabels} />
        <Toggle label="Landmarks" on={p.showPois} set={p.setShowPois} />
      </section>
    </aside>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked)} />
      <i />
    </label>
  );
}
