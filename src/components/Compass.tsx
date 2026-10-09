import { compassPoint } from '../map/unitView';

/** North-pointing compass; the dial turns with the map. Click to face north. */
export default function Compass({ bearing, onReset }: { bearing: number; onReset: () => void }) {
  const heading = ((Math.round(bearing) % 360) + 360) % 360;
  return (
    <button className="compass" onClick={onReset} title="Click to face north">
      <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden>
        <g transform={`rotate(${-bearing} 32 32)`}>
          <circle cx="32" cy="32" r="29" fill="#fff" stroke="#dfe3e9" strokeWidth="2" />
          {[90, 180, 270].map((a) => (
            <line key={a} x1="32" y1="5" x2="32" y2="10" stroke="#9aa3ad" strokeWidth="2" transform={`rotate(${a} 32 32)`} />
          ))}
          <polygon points="32,17 37,32 27,32" fill="#e03131" />
          <polygon points="32,49 37,32 27,32" fill="#c3c9d2" />
          <circle cx="32" cy="32" r="3" fill="#fff" stroke="#9aa3ad" />
          <text x="32" y="15.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="#e03131">N</text>
        </g>
      </svg>
      <span>{compassPoint(heading)} {heading}°</span>
    </button>
  );
}
