import { useCallback, useRef, useState } from 'react';
import MapView, { type FlyTarget, type Selection } from './map/MapView';
import TopBar from './components/TopBar';
import SidePanel, { type PanelTab } from './components/SidePanel';
import NearbyPanel from './components/NearbyPanel';
import { CATEGORIES, type CategoryId, type Place } from './data/nearby';
import { MY_UNIT } from './data/penrith';

/** Named camera views offered in the bottom bar; null once the user moves the map themselves. */
type View = 'overview' | 'site' | 'myUnit' | 'unitView' | null;

const MY_SELECTION: Selection = { block: MY_UNIT.block, stack: MY_UNIT.stack, floor: MY_UNIT.floor };

export default function App() {
  const [selection, setSelection] = useState<Selection>({ block: null, stack: null, floor: null });
  const [tab, setTab] = useState<PanelTab>('nearby');
  const [showContext, setShowContext] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [activeCats, setActiveCats] = useState<CategoryId[]>(() => CATEGORIES.filter((c) => c.defaultOn).map((c) => c.id));
  const [showRings, setShowRings] = useState(false);
  const [focusPlace, setFocusPlace] = useState<{ place: Place; nonce: number } | null>(null);
  const [sunHour, setSunHour] = useState(() => {
    const sgHour = (new Date().getUTCHours() + 8) % 24;
    return sgHour >= 7 && sgHour <= 19 ? sgHour : 15;
  });
  const [fly, setFly] = useState<FlyTarget>({ kind: 'site', nonce: 0 });
  const [view, setView] = useState<View>('site');

  const flyTo = useCallback((t: Omit<FlyTarget, 'nonce'>) => {
    setFly((f) => ({ ...t, nonce: f.nonce + 1 }));
    setView(t.kind === 'block' ? null : t.kind);
  }, []);

  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const select = useCallback((s: Selection) => {
    if (s.block && s.block !== selectionRef.current.block) flyTo({ kind: 'block', block: s.block });
    setSelection(s);
  }, [flyTo]);

  // Clicking a tower on the map should reveal what was picked in the panel.
  const selectFromMap = useCallback((s: Selection) => {
    select(s);
    if (s.block) setTab('units');
  }, [select]);

  const showMyUnit = useCallback(() => {
    setSelection(MY_SELECTION);
    flyTo({ kind: 'myUnit' });
  }, [flyTo]);

  const lookOut = useCallback(() => flyTo({ kind: 'unitView' }), [flyTo]);

  return (
    <div className="app">
      <TopBar />
      <MapView
        selection={selection}
        onSelect={selectFromMap}
        showContext={showContext}
        showLabels={showLabels}
        activeCats={activeCats}
        showRings={showRings}
        focusPlace={focusPlace}
        sunHour={sunHour}
        fly={fly}
        onUserMove={() => setView((v) => (v === 'unitView' ? v : null))}
        onExitUnitView={() => setView('myUnit')}
      />
      <div className="view-bar">
        <div className="seg view-seg" role="group" aria-label="Camera">
          <button className={view === 'overview' ? 'active' : ''} onClick={() => flyTo({ kind: 'overview' })}>Area</button>
          <button className={view === 'site' ? 'active' : ''} onClick={() => flyTo({ kind: 'site' })}>Penrith</button>
          <button className={view === 'myUnit' ? 'active' : ''} onClick={showMyUnit}>My unit</button>
        </div>
        <button className={`look-btn${view === 'unitView' ? ' active' : ''}`} onClick={lookOut} title="Stand inside #39-12 and look out">
          <span aria-hidden>👁</span> View from #{MY_UNIT.floor}-{MY_UNIT.stack}
        </button>
      </div>
      <SidePanel
        tab={tab}
        setTab={setTab}
        selection={selection}
        onSelect={select}
        onShowMyUnit={showMyUnit}
        onLookOut={lookOut}
        showContext={showContext}
        setShowContext={setShowContext}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        nearby={
          <NearbyPanel
            activeCats={activeCats}
            setActiveCats={setActiveCats}
            showRings={showRings}
            setShowRings={setShowRings}
            onPick={(place) => {
              setFocusPlace((f) => ({ place, nonce: (f?.nonce ?? 0) + 1 }));
              setView(null);
            }}
          />
        }
        sunHour={sunHour}
        setSunHour={setSunHour}
      />
    </div>
  );
}
