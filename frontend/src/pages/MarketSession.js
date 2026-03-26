import { useState, useEffect } from 'react';
import PageTitle from '../components/PageTitle';

function SessionCard(props) {
  var s = props.session;
  if (!s) return null;

  var statusColor  = s.is_open ? '#16a34a' : '#dc2626';
  var statusBg     = s.is_open ? '#dcfce7' : '#fee2e2';
  var statusText   = s.is_weekend ? 'Weekend' : s.is_open ? 'Open' : 'Closed';

  function formatCountdown(mins) {
    if (mins == null) return null;
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'm';
  }

  var countdown = s.is_open
    ? 'Closes in ' + formatCountdown(s.minutes_to_close)
    : s.minutes_to_open != null
      ? 'Opens in ' + formatCountdown(s.minutes_to_open)
      : s.is_weekend ? 'Opens Monday' : 'Opens tomorrow';

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid ' + (s.is_open ? '#16a34a' : '#1e293b'),
      borderRadius: 12,
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24 }}>{s.flag}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{s.name}</span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{s.exchange}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 20, background: statusBg, color: statusColor }}>
            {statusText}
          </span>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: '8px 0 0', fontFamily: 'monospace' }}>
            {s.local_time}
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>{s.timezone}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase' }}>Index</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{s.index}</p>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase' }}>Hours (Local)</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{s.open_local} – {s.close_local}</p>
        </div>
        <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase' }}>Currency</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{s.currency}</p>
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.is_open ? '#4ade80' : '#f87171', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: s.is_open ? '#4ade80' : '#f87171', fontWeight: 600 }}>
          {countdown}
        </span>
      </div>
    </div>
  );
}

function ScheduleBar(props) {
  var sessions = props.sessions;
  var now      = new Date();
  var utcHour  = now.getUTCHours() + now.getUTCMinutes() / 60;

  var markets = [
    { code: 'IN', label: 'India',   open: 3.75, close: 10,   color: '#f59e0b' },
    { code: 'DE', label: 'Germany', open: 7,    close: 17,   color: '#3b82f6' },
    { code: 'PL', label: 'Poland',  open: 8,    close: 16,   color: '#8b5cf6' },
  ];

  var dayStart = 0;
  var dayEnd   = 24;
  var range    = dayEnd - dayStart;

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 20px' }}>
        Market Hours Overview (UTC)
      </h2>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        {markets.map(function(m, i) {
          var leftPct  = ((m.open  - dayStart) / range) * 100;
          var widthPct = ((m.close - m.open)   / range) * 100;
          var session  = sessions[m.code];
          var isOpen   = session && session.is_open;

          return (
            <div key={m.code} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#94a3b8', width: 60, flexShrink: 0 }}>{m.label}</span>
              <div style={{ flex: 1, position: 'relative', height: 28, background: '#1e293b', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  position:     'absolute',
                  left:         leftPct + '%',
                  width:        widthPct + '%',
                  height:       '100%',
                  background:   isOpen ? m.color : m.color + '60',
                  borderRadius: 4,
                  display:      'flex',
                  alignItems:   'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>
                    {m.open}:00 – {m.close}:00
                  </span>
                </div>
                <div style={{
                  position:  'absolute',
                  left:      ((utcHour - dayStart) / range * 100) + '%',
                  top:       0,
                  height:    '100%',
                  width:     2,
                  background: '#f1f5f9',
                  opacity:   0.8,
                }} />
              </div>
              <span style={{ fontSize: 11, color: isOpen ? '#4ade80' : '#f87171', fontWeight: 600, width: 50, flexShrink: 0 }}>
                {isOpen ? 'OPEN' : 'CLOSED'}
              </span>
            </div>
          );
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {[0, 3, 6, 9, 12, 15, 18, 21, 24].map(function(h) {
            return (
              <span key={h} style={{ fontSize: 10, color: '#475569' }}>{h}:00</span>
            );
          })}
        </div>
      </div>
      <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>
        White line = current UTC time · Bright = market open · Dim = market closed
      </p>
    </div>
  );
}

export default function MarketSession() {
  var [sessions, setSessions]   = useState({});
  var [loading, setLoading]     = useState(true);
  var [lastUpdate, setLastUpdate] = useState(null);

  function fetchSessions() {
    fetch('http://localhost:3001/api/sessions')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setSessions(data);
        setLoading(false);
        setLastUpdate(new Date().toLocaleTimeString());
      })
      .catch(function(e) {
        console.error(e);
        setLoading(false);
      });
  }

  useEffect(function() {
    fetchSessions();
    var interval = setInterval(fetchSessions, 30000);
    return function() { clearInterval(interval); };
  }, []);

  var sessionList = ['IN', 'DE', 'PL'];

  return (
    <div style={{ color: '#f1f5f9' }}>
      <PageTitle title="Market Sessions" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px', color: '#f1f5f9' }}>Market Sessions</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: 13 }}>
            Live trading session status for all markets · updates every 30 seconds
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: '#4ade80' }} />
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {lastUpdate ? 'Updated ' + lastUpdate : 'Loading...'}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
          <p style={{ fontSize: 15 }}>Loading session data...</p>
        </div>
      ) : (
        <div>
          <ScheduleBar sessions={sessions} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {sessionList.map(function(code) {
              return <SessionCard key={code} session={sessions[code]} />;
            })}
          </div>
        </div>
      )}
    </div>
  );
}