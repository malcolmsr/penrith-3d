import type { ReactNode } from 'react';
import { BLOCKS, MY_UNIT, PROJECT, STACKS, STACK_COLORS, type BlockId } from '../data/penrith';
import type { Selection } from '../map/MapView';

export type PanelTab = 'nearby' | 'units' | 'display';

interface Props {
  tab: PanelTab;
  setTab: (t: PanelTab) => void;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onShowMyUnit: () => void;
  onLookOut: () => void;
  showContext: boolean;
  setShowContext: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  nearby: ReactNode;
  sunHour: number;
  setSunHour: (v: number) => void;
}

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'nearby', label: 'Nearby' },
  { id: 'units', label: 'Units' },
  { id: 'display', label: 'Display' },
];

const fmtHour = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const ampm = hh >= 12 ? 'pm' : 'am';
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ampm}`;
};

const unitNo = (floor: number, stack: string) => `#${String(floor).padStart(2, '0')}-${stack}`;

export default function SidePanel(p: Props) {
  return (
    <aside className="panel">
      <section className="card hero">
        <div className="eyebrow">{PROJECT.district}</div>
        <h1>{PROJECT.name}</h1>
        <div className="muted">{PROJECT.address}</div>
        <div className="muted small facts">
          {PROJECT.towers} towers · {PROJECT.storeys} storeys · {PROJECT.units} units · {PROJECT.tenure} · keys {PROJECT.vacantPossession}
        </div>
        <div className="mine">
          <span className="dot" />
          <div className="mine-text">
            <b>My unit · #{MY_UNIT.floor}-{MY_UNIT.stack}</b>
            <div className="muted small">Block {MY_UNIT.block} · Type {MY_UNIT.type} · {MY_UNIT.bedrooms} BR · {MY_UNIT.sqm} sqm</div>
          </div>
        </div>
        <div className="mine-actions">
          <button onClick={p.onShowMyUnit}>Show on map</button>
          <button className="primary" onClick={p.onLookOut}>👁 View from unit</button>
        </div>
      </section>

      <div className="seg tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={p.tab === t.id} className={p.tab === t.id ? 'active' : ''} onClick={() => p.setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {p.tab === 'nearby' && p.nearby}
      {p.tab === 'units' && <UnitsTab selection={p.selection} onSelect={p.onSelect} />}
      {p.tab === 'display' && (
        <section className="card">
          <label className="field-label">Time of day <span className="muted">{fmtHour(p.sunHour)}</span></label>
          <input type="range" min={7} max={19} step={0.25} value={p.sunHour} onChange={(e) => p.setSunHour(Number(e.target.value))} />
          <div className="range-ends muted"><span>7 am</span><span>1 pm</span><span>7 pm</span></div>
          <div className="toggles">
            <Toggle label="Surrounding buildings" on={p.showContext} set={p.setShowContext} />
            <Toggle label="Building & unit labels" on={p.showLabels} set={p.setShowLabels} />
          </div>
        </section>
      )}
    </aside>
  );
}

function UnitsTab({ selection: sel, onSelect }: { selection: Selection; onSelect: (s: Selection) => void }) {
  const stack = sel.stack ? STACKS.find((s) => s.id === sel.stack) : null;
  const isMine = sel.stack === MY_UNIT.stack && sel.floor === MY_UNIT.floor;

  return (
    <section className="card">
      <label className="field-label">Block</label>
      <div className="seg">
        {BLOCKS.map((b) => (
          <button key={b.id} className={sel.block === b.id ? 'active' : ''}
            onClick={() => onSelect({ block: b.id as BlockId, stack: null, floor: null })}>
            Block {b.id}
          </button>
        ))}
        <button className={!sel.block ? 'active' : ''} onClick={() => onSelect({ block: null, stack: null, floor: null })}>Both</button>
      </div>

      {!sel.block && <div className="muted small">Pick a block — or click a tower on the map.</div>}

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
            Floor
            <span className={sel.floor ? 'unit-no' : 'muted'}>{sel.floor ? unitNo(sel.floor, stack.id) : 'drag to pick'}</span>
          </label>
          <input type="range" min={2} max={stack.topFloor} value={sel.floor ?? 2}
            onChange={(e) => onSelect({ ...sel, floor: Number(e.target.value) })} />
          <div className="muted small">
            Stack {stack.id} runs storeys 2–{stack.topFloor}{stack.topFloor === 39 ? ' (roof garden above)' : ''}
            {isMine && <> · <b className="pink">this is your unit</b></>}
          </div>
        </>
      )}

      {sel.block && (
        <button className="link" onClick={() => onSelect({ block: null, stack: null, floor: null })}>Clear selection (Esc)</button>
      )}
    </section>
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
