import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PageTitle from '../components/PageTitle';

var PLANS = [
  {
    id:       'pl',
    name:     'Poland Pro',
    flag:     '🇵🇱',
    price:    4.99,
    currency: '€',
    country:  'PL',
    color:    '#3b82f6',
    features: [
      'Full WIG30 stock screener',
      'Intraday Boosters — Poland',
      'NR7 & Momentum Spikes',
      'Sector Scope — Poland',
      'Top Movers — unlimited',
      'Signal persistence all day',
    ],
  },
  {
    id:       'de',
    name:     'Germany Pro',
    flag:     '🇩🇪',
    price:    4.99,
    currency: '€',
    country:  'DE',
    color:    '#f59e0b',
    features: [
      'Full DAX30 stock screener',
      'Intraday Boosters — Germany',
      'NR7 & Momentum Spikes',
      'Sector Scope — Germany',
      'Top Movers — unlimited',
      'Signal persistence all day',
    ],
  },
  {
    id:       'in',
    name:     'India Pro',
    flag:     '🇮🇳',
    price:    2.99,
    currency: '€',
    country:  'IN',
    color:    '#f97316',
    features: [
      'Full Nifty 50 stock screener',
      'Intraday Boosters — India',
      'NR7 & Momentum Spikes',
      'Sector Scope — India',
      'Top Movers — unlimited',
      'Signal persistence all day',
    ],
  },
  {
    id:       'global',
    name:     'Global Pro',
    flag:     '🌍',
    price:    9.99,
    currency: '€',
    country:  'ALL',
    color:    '#8b5cf6',
    badge:    'Best Value',
    features: [
      'Everything in all country plans',
      'Poland + Germany + India',
      'Cross-market sector comparison',
      'All screeners — all countries',
      'Priority signal updates',
      'Save 40% vs buying separately',
    ],
  },
];

var FREE_FEATURES = [
  'Indices ticker carousel',
  'All Tickers — Poland (top 10)',
  'Top Movers — top 3 only',
  'Market Sessions page',
  'Trading Journal',
];

function PlanCard(props) {
  var plan      = props.plan;
  var current   = props.current;
  var onSelect  = props.onSelect;
  var isGlobal  = plan.id === 'global';

  return (
    <div style={{
      background:   '#0f172a',
      border:       '2px solid ' + (isGlobal ? plan.color : current ? plan.color : '#1e293b'),
      borderRadius: 16,
      padding:      28,
      display:      'flex',
      flexDirection: 'column',
      gap:          16,
      position:     'relative',
      transition:   'border-color 0.2s',
    }}>
      {plan.badge && (
        <div style={{
          position:     'absolute',
          top:          -12,
          left:         '50%',
          transform:    'translateX(-50%)',
          background:   plan.color,
          color:        '#fff',
          fontSize:     11,
          fontWeight:   700,
          padding:      '3px 14px',
          borderRadius: 20,
          whiteSpace:   'nowrap',
        }}>
          {plan.badge}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 28 }}>{plan.flag}</span>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{plan.name}</p>
          {plan.country !== 'ALL' && (
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>Single country access</p>
          )}
          {plan.country === 'ALL' && (
            <p style={{ fontSize: 11, color: plan.color, margin: 0, fontWeight: 600 }}>All 3 countries included</p>
          )}
        </div>
      </div>

      <div>
        <span style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9' }}>{plan.currency}{plan.price}</span>
        <span style={{ fontSize: 13, color: '#64748b' }}>/month</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.features.map(function(f, i) {
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: plan.color, fontSize: 14, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{f}</span>
            </div>
          );
        })}
      </div>

      <button
        onClick={function() { onSelect(plan); }}
        style={{
          background:   current ? plan.color : 'transparent',
          color:        current ? '#fff' : plan.color,
          border:       '2px solid ' + plan.color,
          borderRadius: 8,
          padding:      '10px 0',
          fontSize:     14,
          fontWeight:   600,
          cursor:       'pointer',
          marginTop:    'auto',
          transition:   'all 0.15s',
          width:        '100%',
        }}
      >
        {current ? 'Current Plan' : 'Subscribe — ' + plan.currency + plan.price + '/mo'}
      </button>
    </div>
  );
}

export default function Pricing() {
  var { user, login }   = useAuth();
  var navigate          = useNavigate();
  var [selected, setSelected] = useState(null);
  var [success, setSuccess]   = useState(false);

  var currentPlan = user ? user.plan : 'free';
  var currentCountries = user ? (user.countries || []) : [];

  function handleSelect(plan) {
    setSelected(plan);
  }

  function handleConfirm() {
    if (!selected) return;

    var newCountries = currentCountries.slice();
    if (selected.id === 'global') {
      login('dev-token');
      var updatedUser = {
        name:      user ? user.name : 'User',
        plan:      'global',
        countries: ['PL', 'DE', 'IN'],
        token:     'dev-token',
      };
      localStorage.setItem('mt_user', JSON.stringify(updatedUser));
      window.location.href = '/';
    } else {
      if (!newCountries.includes(selected.country)) {
        newCountries.push(selected.country);
      }
      var updatedUser2 = {
        name:      user ? user.name : 'User',
        plan:      'country',
        countries: newCountries,
        token:     'dev-token',
      };
      localStorage.setItem('mt_user', JSON.stringify(updatedUser2));
      window.location.href = '/';
    }
  }

  return (
    <div style={{ color: '#f1f5f9', minHeight: '100vh', background: '#0a0f1e', padding: '40px 24px' }}>
      <PageTitle title="Pricing" />

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: '#f1f5f9', margin: '0 0 12px' }}>
            Choose your markets
          </h1>
          <p style={{ fontSize: 16, color: '#64748b', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            Pay only for the markets you trade. Subscribe per country or go Global for full access.
          </p>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🆓</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>Free — Always included</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {FREE_FEATURES.map(function(f, i) {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#4ade80', fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{f}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
          {PLANS.map(function(plan) {
            var isCurrent = currentPlan === 'global'
              ? plan.id === 'global'
              : currentPlan === 'country' && currentCountries.includes(plan.country);
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                current={selected ? selected.id === plan.id : isCurrent}
                onSelect={handleSelect}
              />
            );
          })}
        </div>

        {selected && (
          <div style={{
            position:     'fixed',
            bottom:       32,
            left:         '50%',
            transform:    'translateX(-50%)',
            background:   '#1e293b',
            border:       '1px solid #334155',
            borderRadius: 12,
            padding:      '16px 24px',
            display:      'flex',
            alignItems:   'center',
            gap:          20,
            boxShadow:    '0 20px 60px rgba(0,0,0,0.5)',
            zIndex:       100,
            minWidth:     360,
          }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                {selected.flag} {selected.name}
              </p>
              <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
                {selected.currency}{selected.price}/month
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <button
              onClick={function() { setSelected(null); }}
              style={{ background: 'none', border: '1px solid #334155', borderRadius: 8, padding: '8px 16px', color: '#64748b', fontSize: 13, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              style={{ background: '#3b82f6', border: 'none', borderRadius: 8, padding: '8px 20px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Confirm — Add to Stripe
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.8 }}>
            All plans are monthly. Cancel anytime. Stripe handles all payments securely.
            MorningTrade does not store payment information.
            Prices shown in EUR. Local currency conversion applied at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}