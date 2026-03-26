import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  var { user, login } = useAuth();
  var navigate        = useNavigate();

  useEffect(function() {
    if (user) navigate('/');
  }, [user, navigate]);

  var options = [
    { label: 'Free',            plan: 'free',    countries: [],                  color: '#475569', desc: 'All Tickers + Top Movers only'          },
    { label: '🇵🇱 Poland Pro',   plan: 'country', countries: ['PL'],              color: '#3b82f6', desc: 'Full screener for Poland'               },
    { label: '🇩🇪 Germany Pro',  plan: 'country', countries: ['DE'],              color: '#f59e0b', desc: 'Full screener for Germany'              },
    { label: '🇮🇳 India Pro',    plan: 'country', countries: ['IN'],              color: '#f97316', desc: 'Full screener for India'                },
    { label: '🌍 Global Pro',   plan: 'global',  countries: ['PL', 'DE', 'IN'], color: '#8b5cf6', desc: 'All countries — full access'            },
    { label: '📊 Options Pro',  plan: 'options', countries: [],                  color: '#06b6d4', desc: 'NIFTY + BANKNIFTY + SENSEX options'     },
  ];

  function handleEnter(opt) {
    var newUser = {
      name:      'Demo User',
      plan:      opt.plan,
      countries: opt.countries,
      token:     'dev-token',
    };
    localStorage.setItem('mt_token', 'dev-token');
    localStorage.setItem('mt_user', JSON.stringify(newUser));
    login('dev-token');
    navigate('/');
  }

  return (
    <div style={{
      minHeight:      '100vh',
      background:     '#0a0f1e',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        24,
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' }}>
            Morning<span style={{ color: '#60a5fa' }}>Trade</span>
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            European and Indian market analytics
          </p>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', margin: '0 0 16px', textAlign: 'center' }}>
            Sign in as
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {options.map(function(opt) {
              return (
                <button
                  key={opt.plan + opt.countries.join('')}
                  onClick={function() { handleEnter(opt); }}
                  style={{
                    background:     'transparent',
                    border:         '1px solid ' + opt.color + '44',
                    borderRadius:   10,
                    padding:        '12px 16px',
                    cursor:         'pointer',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'space-between',
                    transition:     'all 0.15s',
                    width:          '100%',
                  }}
                  onMouseEnter={function(e) {
                    e.currentTarget.style.background    = opt.color + '18';
                    e.currentTarget.style.borderColor   = opt.color;
                  }}
                  onMouseLeave={function(e) {
                    e.currentTarget.style.background    = 'transparent';
                    e.currentTarget.style.borderColor   = opt.color + '44';
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{opt.label}</p>
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{opt.desc}</p>
                  </div>
                  <span style={{
                    fontSize:   12,
                    fontWeight: 700,
                    color:      opt.color,
                    padding:    '3px 10px',
                    borderRadius: 20,
                    background: opt.color + '22',
                    border:     '1px solid ' + opt.color + '44',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}>
                    Enter →
                  </span>
                </button>
              );
            })}
          </div>

          <p style={{ fontSize: 11, color: '#334155', margin: '20px 0 0', textAlign: 'center', lineHeight: 1.6 }}>
            Google login + Stripe payments coming soon.
            This is a development preview.
          </p>
        </div>
      </div>
    </div>
  );
}