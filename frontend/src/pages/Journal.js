import { useState, useEffect } from 'react';

var STORAGE_KEY = 'morningtrade_journal';

var SETUPS = ['ORB', 'NR7', 'Momentum Spike', 'Breakout', 'Reversal', 'Other'];
var OUTCOMES = ['Win', 'Loss', 'Breakeven'];
var DIRECTIONS = ['Long', 'Short'];

function loadTrades() {
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch(e) {
    return [];
  }
}

function saveTrades(trades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EmptyForm() {
  return {
    date:       new Date().toISOString().split('T')[0],
    symbol:     '',
    direction:  'Long',
    setup:      'ORB',
    entry:      '',
    exit:       '',
    size:       '',
    pnl:        '',
    outcome:    'Win',
    notes:      '',
  };
}

export default function Journal() {
  var [trades, setTrades]       = useState(loadTrades);
  var [showForm, setShowForm]   = useState(false);
  var [form, setForm]           = useState(EmptyForm());
  var [editId, setEditId]       = useState(null);
  var [filter, setFilter]       = useState('all');
  var [search, setSearch]       = useState('');

  useEffect(function() {
    saveTrades(trades);
  }, [trades]);

  function handleChange(e) {
    var key = e.target.name;
    var val = e.target.value;
    setForm(function(prev) {
      return Object.assign({}, prev, { [key]: val });
    });
  }

  function handleSubmit() {
    if (!form.symbol || !form.entry) return;
    if (editId !== null) {
      setTrades(function(prev) {
        return prev.map(function(t) {
          return t.id === editId ? Object.assign({}, form, { id: editId }) : t;
        });
      });
      setEditId(null);
    } else {
      var newTrade = Object.assign({}, form, { id: Date.now() });
      setTrades(function(prev) { return [newTrade, ...prev]; });
    }
    setForm(EmptyForm());
    setShowForm(false);
  }

  function handleEdit(trade) {
    setForm(trade);
    setEditId(trade.id);
    setShowForm(true);
  }

  function handleDelete(id) {
    setTrades(function(prev) { return prev.filter(function(t) { return t.id !== id; }); });
  }

  var filtered = trades.filter(function(t) {
    var matchFilter = filter === 'all' ? true : t.outcome === filter;
    var matchSearch = !search || t.symbol.toLowerCase().includes(search.toLowerCase()) || (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()));
    return matchFilter && matchSearch;
  });

  var totalPnl  = trades.reduce(function(sum, t) { return sum + (parseFloat(t.pnl) || 0); }, 0);
  var wins      = trades.filter(function(t) { return t.outcome === 'Win'; }).length;
  var losses    = trades.filter(function(t) { return t.outcome === 'Loss'; }).length;
  var winRate   = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Trading Journal</h1>
          <p style={{ color: '#6b7280', margin: 0, fontSize: 13 }}>Log and review all your trades</p>
        </div>
        <button
          onClick={function() { setForm(EmptyForm()); setEditId(null); setShowForm(!showForm); }}
          style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          {showForm ? 'Cancel' : '+ Log Trade'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={styles.statCard}>
          <span style={styles.statVal}>{trades.length}</span>
          <span style={styles.statLabel}>Total Trades</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statVal, color: totalPnl >= 0 ? '#16a34a' : '#dc2626' }}>
            {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
          </span>
          <span style={styles.statLabel}>Total P&L</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statVal, color: '#16a34a' }}>{wins}</span>
          <span style={styles.statLabel}>Wins</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statVal, color: '#dc2626' }}>{losses}</span>
          <span style={styles.statLabel}>Losses</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statVal, color: winRate >= 50 ? '#16a34a' : '#dc2626' }}>{winRate}%</span>
          <span style={styles.statLabel}>Win Rate</span>
        </div>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>
            {editId ? 'Edit Trade' : 'Log New Trade'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <div style={styles.field}>
              <label style={styles.label}>Date</label>
              <input name="date" type="date" value={form.date} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Symbol</label>
              <input name="symbol" type="text" placeholder="e.g. PKN" value={form.symbol} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Direction</label>
              <select name="direction" value={form.direction} onChange={handleChange} style={styles.input}>
                {DIRECTIONS.map(function(d) { return <option key={d}>{d}</option>; })}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Setup</label>
              <select name="setup" value={form.setup} onChange={handleChange} style={styles.input}>
                {SETUPS.map(function(s) { return <option key={s}>{s}</option>; })}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Entry Price</label>
              <input name="entry" type="number" placeholder="0.00" value={form.entry} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Exit Price</label>
              <input name="exit" type="number" placeholder="0.00" value={form.exit} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Position Size</label>
              <input name="size" type="number" placeholder="0" value={form.size} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>P&L</label>
              <input name="pnl" type="number" placeholder="0.00" value={form.pnl} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Outcome</label>
              <select name="outcome" value={form.outcome} onChange={handleChange} style={styles.input}>
                {OUTCOMES.map(function(o) { return <option key={o}>{o}</option>; })}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Notes</label>
            <textarea
              name="notes"
              placeholder="What happened? What did you learn?"
              value={form.notes}
              onChange={handleChange}
              style={{ ...styles.input, width: '100%', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button
              onClick={handleSubmit}
              style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {editId ? 'Save Changes' : 'Log Trade'}
            </button>
            <button
              onClick={function() { setShowForm(false); setEditId(null); setForm(EmptyForm()); }}
              style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 20px', fontSize: 14, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search symbol or notes..."
          value={search}
          onChange={function(e) { setSearch(e.target.value); }}
          style={{ ...styles.input, width: 200 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'Win', 'Loss', 'Breakeven'].map(function(f) {
            return (
              <button
                key={f}
                onClick={function() { setFilter(f); }}
                style={{
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  background: filter === f
                    ? f === 'Win' ? '#16a34a' : f === 'Loss' ? '#dc2626' : f === 'Breakeven' ? '#d97706' : '#1d4ed8'
                    : '#f3f4f6',
                  color: filter === f ? '#fff' : '#6b7280',
                }}
              >
                {f === 'all' ? 'All' : f}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: '#9ca3af' }}>
          {trades.length === 0 ? 'No trades logged yet. Click Log Trade to add your first one.' : 'No trades match your filter.'}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={styles.tableHeader}>
            <span>Date</span>
            <span>Symbol</span>
            <span>Direction</span>
            <span>Setup</span>
            <span>Entry</span>
            <span>Exit</span>
            <span>Size</span>
            <span>P&L</span>
            <span>Outcome</span>
            <span>Actions</span>
          </div>
          {filtered.map(function(trade) {
            var isWin = trade.outcome === 'Win';
            var isLoss = trade.outcome === 'Loss';
            var pnl = parseFloat(trade.pnl) || 0;
            return (
              <div key={trade.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <div style={styles.tableRow}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{formatDate(trade.date)}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{trade.symbol}</span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: trade.direction === 'Long' ? '#dcfce7' : '#fee2e2',
                    color: trade.direction === 'Long' ? '#15803d' : '#dc2626',
                    display: 'inline-block',
                  }}>
                    {trade.direction}
                  </span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{trade.setup}</span>
                  <span style={{ fontSize: 13 }}>{trade.entry || '--'}</span>
                  <span style={{ fontSize: 13 }}>{trade.exit || '--'}</span>
                  <span style={{ fontSize: 13 }}>{trade.size || '--'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: pnl > 0 ? '#16a34a' : pnl < 0 ? '#dc2626' : '#6b7280' }}>
                    {pnl > 0 ? '+' : ''}{pnl !== 0 ? pnl.toFixed(2) : '--'}
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: isWin ? '#dcfce7' : isLoss ? '#fee2e2' : '#fef9c3',
                    color: isWin ? '#15803d' : isLoss ? '#dc2626' : '#92400e',
                    display: 'inline-block',
                  }}>
                    {trade.outcome}
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={function() { handleEdit(trade); }}
                      style={{ fontSize: 11, color: '#1d4ed8', background: '#eff6ff', border: 'none', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={function() { handleDelete(trade.id); }}
                      style={{ fontSize: 11, color: '#dc2626', background: '#fee2e2', border: 'none', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
                    >
                      Delete
                    </button>
                  </span>
                </div>
                {trade.notes && (
                  <div style={{ padding: '6px 16px 10px', fontSize: 12, color: '#6b7280', background: '#fafafa', borderTop: '1px solid #f9fafb' }}>
                    {trade.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  statCard:    { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4 },
  statVal:     { fontSize: 22, fontWeight: 700, color: '#111827' },
  statLabel:   { fontSize: 11, color: '#9ca3af' },
  field:       { display: 'flex', flexDirection: 'column', gap: 4 },
  label:       { fontSize: 12, fontWeight: 500, color: '#6b7280' },
  input:       { padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13, outline: 'none', background: '#fff', color: '#111827' },
  tableHeader: { display: 'grid', gridTemplateColumns: '100px 80px 80px 100px 70px 70px 60px 80px 90px 100px', padding: '10px 16px', background: '#f9fafb', fontSize: 11, fontWeight: 600, color: '#9ca3af', borderBottom: '1px solid #e5e7eb' },
  tableRow:    { display: 'grid', gridTemplateColumns: '100px 80px 80px 100px 70px 70px 60px 80px 90px 100px', padding: '12px 16px', alignItems: 'center', gap: 4 },
};