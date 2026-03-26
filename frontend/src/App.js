import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Stocks from './pages/Stocks';
import Screener from './pages/Screener';
import Journal from './pages/Journal';
import SectorScope from './pages/SectorScope';
import MarketSession from './pages/MarketSession';
import Pricing from './pages/Pricing';
import Options from './pages/Options';
import OptionChain from './pages/OptionChain';
import Login from './pages/Login';
import AuthSuccess from './pages/AuthSuccess';
import IndicesTicker from './components/IndicesTicker';

function FooterDisclaimer() {
  return (
    <div style={{
      borderTop:  '1px solid #1e293b',
      padding:    '12px 24px',
      background: '#0f172a',
      fontSize:   11,
      color:      '#334155',
      textAlign:  'center',
    }}>
      <span style={{ fontWeight: 600, color: '#475569' }}>MorningTrade </span>
      · Data delayed ~15 min · Not investment advice · No MiFID II/KNF/BaFin licence
      &nbsp;·&nbsp; &copy; {new Date().getFullYear()} MorningTrade
    </div>
  );
}

function ProtectedRoute({ children }) {
  var { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748b' }}>Loading...</p>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function PlanBadge({ user }) {
  if (!user) return null;
  var label = user.plan === 'global'  ? 'Global Pro'  :
              user.plan === 'country' ? 'Country Pro' :
              user.plan === 'options' ? 'Options Pro' :
              user.plan === 'admin'   ? 'Admin'       : 'Free';
  var color = user.plan === 'free' ? '#475569' : '#3b82f6';
  return (
    <span style={{ fontSize: 10, background: color + '22', color: color, padding: '2px 7px', borderRadius: 10, fontWeight: 700, border: '1px solid ' + color + '44' }}>
      {label}
    </span>
  );
}

function Sidebar({ collapsed, setCollapsed }) {
  var { user, logout } = useAuth();

  var sections = [
    {
      label: 'Markets',
      links: [
        { to: '/',               label: 'All Tickers'     },
        { to: '/screener',       label: 'Screener'        },
        { to: '/sector-scope',   label: 'Sector Scope'    },
        { to: '/market-session', label: 'Market Sessions' },
      ],
    },
    {
      label: 'Options',
      links: [
        { to: '/options',      label: 'Options Analysis' },
        { to: '/option-chain', label: 'Option Chain'     },
      ],
    },
    {
      label: 'Journal',
      links: [
        { to: '/journal', label: 'Trading Journal' },
      ],
    },
  ];

  return (
    <div style={{
      width:         collapsed ? 56 : 220,
      minHeight:     '100vh',
      background:    '#0f172a',
      borderRight:   '1px solid #1e293b',
      transition:    'width 0.2s',
      flexShrink:    0,
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden',
    }}>
      <div style={{
        padding:        collapsed ? '16px 0' : '16px 20px',
        display:        'flex',
        alignItems:     'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom:   '1px solid #1e293b',
        minHeight:      64,
      }}>
        <div
          style={{ cursor: 'pointer' }}
          onClick={function() { window.location.href = '/'; }}
        >
          {!collapsed && (
            <span style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>
              Morning<span style={{ color: '#60a5fa' }}>Trade</span>
            </span>
          )}
          {collapsed && (
            <span style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa' }}>MT</span>
          )}
        </div>
        <button
          onClick={function() { setCollapsed(!collapsed); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 16, padding: 0, lineHeight: 1 }}
        >
          {collapsed ? '>>' : '<<'}
        </button>
      </div>

      <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {sections.map(function(section) {
          return (
            <div key={'section-' + section.label} style={{ marginBottom: 8 }}>
              {!collapsed && (
                <div style={{ padding: '8px 20px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {section.label}
                  </span>
                </div>
              )}
              {collapsed && (
                <div style={{ padding: '4px 0', margin: '4px 8px' }}>
                  <div style={{ height: 1, background: '#1e293b' }} />
                </div>
              )}
              {section.links.map(function(link) {
                return (
                  <NavLink
                    key={'link-' + link.to}
                    to={link.to}
                    end={link.to === '/'}
                    style={function(p) {
                      return {
                        display:        'flex',
                        alignItems:     'center',
                        gap:            10,
                        padding:        collapsed ? '8px 0' : '8px 20px 8px 32px',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        fontSize:       14,
                        fontWeight:     500,
                        color:          p.isActive ? '#60a5fa' : '#94a3b8',
                        textDecoration: 'none',
                        background:     p.isActive ? 'rgba(96,165,250,0.08)' : 'transparent',
                        borderLeft:     p.isActive ? '2px solid #60a5fa' : '2px solid transparent',
                        transition:     'all 0.15s',
                        pointerEvents:  link.soon ? 'none' : 'auto',
                        opacity:        link.soon ? 0.4 : 1,
                      };
                    }}
                  >
                    {!collapsed && link.label}
                    {!collapsed && link.soon && (
                      <span style={{ fontSize: 10, background: '#1e3a5f', color: '#60a5fa', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                        Soon
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {user && (
        <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderTop: '1px solid #1e293b' }}>
          {!collapsed && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#1e293b', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 13, color: '#60a5fa',
                  fontWeight: 700, flexShrink: 0,
                }}>
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </p>
                </div>
              </div>
              <PlanBadge user={user} />
              {user.plan === 'free' && (
                <NavLink
                  to="/pricing"
                  style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#3b82f6', fontWeight: 600, textDecoration: 'none', padding: '6px 10px', background: 'rgba(59,130,246,0.1)', borderRadius: 6, textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}
                >
                  Upgrade Plan ↗
                </NavLink>
              )}
              {user.plan === 'country' && (
                <NavLink
                  to="/pricing"
                  style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#8b5cf6', fontWeight: 600, textDecoration: 'none', padding: '5px 10px', background: 'rgba(139,92,246,0.1)', borderRadius: 6, textAlign: 'center', border: '1px solid rgba(139,92,246,0.2)' }}
                >
                  Add more markets ↗
                </NavLink>
              )}
            </div>
          )}
          <button
            onClick={logout}
            style={{ width: '100%', background: 'none', border: '1px solid #1e293b', borderRadius: 6, padding: '6px 0', color: '#475569', fontSize: 12, cursor: 'pointer' }}
          >
            {collapsed ? 'X' : 'Sign out'}
          </button>
        </div>
      )}

      <div style={{ padding: collapsed ? '8px 0' : '8px 20px', textAlign: collapsed ? 'center' : 'left' }}>
        <span style={{ fontSize: 11, color: '#1e293b' }}>
          {collapsed ? 'v1' : 'MorningTrade v1.0'}
        </span>
      </div>
    </div>
  );
}

function AppLayout() {
  var [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <IndicesTicker />
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div style={{ flex: 1, background: '#0a0f1e', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, maxWidth: 1200, margin: '0 auto', padding: 24, width: '100%' }}>
            <Routes>
              <Route path="/"               element={<Stocks />}       />
              <Route path="/screener"       element={<Screener />}     />
              <Route path="/sector-scope"   element={<SectorScope />}  />
              <Route path="/market-session" element={<MarketSession />}/>
              <Route path="/journal"        element={<Journal />}      />
              <Route path="/pricing"        element={<Pricing />}      />
              <Route path="/options"        element={<Options />}      />
              <Route path="/option-chain"   element={<OptionChain />}  />
            </Routes>
          </div>
          <FooterDisclaimer />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"        element={<Login />}       />
        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}