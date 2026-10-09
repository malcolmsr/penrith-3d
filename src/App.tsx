import { useCallback, useRef, useState } from 'react';
import MapView, { type FlyTarget, type Selection } from './map/MapView';
import TopBar from './components/TopBar';
import SidePanel from './components/SidePanel';
import NearbyPanel from './components/NearbyPanel';
import { CATEGORIES, type CategoryId, type Place } from './data/nearby';

export default function App() {
  const [selection, setSelection] = useState<Selection>({ block: null, stack: null, floor: null });
  const [showContext, setShowContext] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [activeCats, setActiveCats] = useState<CategoryId[]>(() => CATEGORIES.filter((c) => c.defaultOn).map((c) => c.id));
  const [listCat, setListCat] = useState<CategoryId>('transport');
  const [showRings, setShowRings] = useState(false);
  const [focusPlace, setFocusPlace] = useState<{ place: Place; nonce: number } | null>(null);
  const [sunHour, setSunHour] = useState(() => {
    const sgHour = (new Date().getUTCHours() + 8) % 24;
    return sgHour >= 7 && sgHour <= 19 ? sgHour : 15;
  });
  const [fly, setFly] = useState<FlyTarget>({ kind: 'site', nonce: 0 });

  const flyTo = useCallback((t: Omit<FlyTarget, 'nonce'>) => setFly((f) => ({ ...t, nonce: f.nonce + 1 })), []);

  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const select = useCallback((s: Selection) => {
    if (s.block && s.block !== selectionRef.current.block) flyTo({ kind: 'block', block: s.block });
    setSelection(s);
  }, [flyTo]);

  return (
    <div className="app">
      <TopBar />
      <MapView
        selection={selection}
        onSelect={select}
        showContext={showContext}
        showLabels={showLabels}
        activeCats={activeCats}
        showRings={showRings}
        focusPlace={focusPlace}
        sunHour={sunHour}
        fly={fly}
      />
      <div className="view-buttons">
        <button onClick={() => flyTo({ kind: 'topDown' })} title="Flat, north-up view (press again for 3D)">Top down</button>
        <button onClick={() => flyTo({ kind: 'overview' })}>Neighbourhood</button>
        <button onClick={() => flyTo({ kind: 'site' })}>Penrith</button>
        <button className="primary" onClick={() => { setSelection({ block: '72', stack: '12', floor: 39 }); flyTo({ kind: 'myUnit' }); }}>
          My unit
        </button>
        <button className="primary" onClick={() => flyTo({ kind: 'unitView' })} title="See the view from #39-12">
          From my unit
        </button>
      </div>
      <SidePanel
        selection={selection}
        onSelect={select}
        showContext={showContext}
        setShowContext={setShowContext}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        nearby={
          <NearbyPanel
            activeCats={activeCats}
            setActiveCats={setActiveCats}
            listCat={listCat}
            setListCat={setListCat}
            showRings={showRings}
            setShowRings={setShowRings}
            onPick={(place) => setFocusPlace((f) => ({ place, nonce: (f?.nonce ?? 0) + 1 }))}
          />
        }
        sunHour={sunHour}
        setSunHour={setSunHour}
      />
    </div>
  );
}
