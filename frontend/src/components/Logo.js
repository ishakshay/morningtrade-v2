export default function Logo({ size, collapsed }) {
  var s = size || 32;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={s} height={s} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="#0f172a"/>
        <rect width="32" height="32" rx="6" fill="url(#grad)"/>
        <polyline
          points="4,22 10,14 16,18 22,10 28,12"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="28" cy="12" r="2" fill="#4ade80"/>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
            <stop offset="0%" stopColor="#0f172a"/>
            <stop offset="100%" stopColor="#1e3a5f"/>
          </linearGradient>
        </defs>
      </svg>
      {!collapsed && (
        <span style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#f1f5f9',
          letterSpacing: '-0.3px',
        }}>
          Morning<span style={{ color: '#60a5fa' }}>Trade</span>
        </span>
      )}
    </div>
  );
}