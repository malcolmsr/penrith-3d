const TABS = ['Home', 'Map', 'My Property', 'Profile'];

export default function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">◆</span> Penrith 3D
      </div>
      <nav>
        {TABS.map((t) => (
          <button key={t} className={t === 'Map' ? 'tab active' : 'tab'} disabled={t !== 'Map'} title={t !== 'Map' ? 'Coming soon' : undefined}>
            {t}
          </button>
        ))}
      </nav>
    </header>
  );
}
