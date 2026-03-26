import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Paywall({ children, country, feature }) {
  var { hasAccess } = useAuth();
  var navigate      = useNavigate();

  if (hasAccess(country)) {
    return children;
  }

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.6 }}>
        {children}
      </div>
      <div style={{
        position:        'absolute',
        top:             0,
        left:            0,
        right:           0,
        bottom:          0,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      'rgba(15,23,42,0.75)',
        backdropFilter:  'blur(2px)',
        zIndex:          10,
        borderRadius:    12,
      }}>
        <div style={{ textAlign: 'center', padding: 32, maxWidth: 320 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>
            Pro Feature
          </p>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 20px', lineHeight: 1.6 }}>
            {feature || 'This feature'} requires a Pro subscription.
            Unlock full access to screeners, sector analysis and signals.
          </p>
          <button
            onClick={function() { navigate('/pricing'); }}
            style={{
              background:   '#3b82f6',
              color:        '#fff',
              border:       'none',
              borderRadius: 8,
              padding:      '10px 28px',
              fontSize:     14,
              fontWeight:   600,
              cursor:       'pointer',
              marginBottom: 8,
              width:        '100%',
            }}
          >
            View Plans
          </button>
          <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
            Cancel anytime · No commitment
          </p>
        </div>
      </div>
    </div>
  );
}