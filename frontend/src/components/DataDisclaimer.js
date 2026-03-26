export function DelayBanner() {
  return (
    <div style={{
      background: '#fefce8',
      border: '1px solid #fde68a',
      borderRadius: 8,
      padding: '8px 14px',
      fontSize: 11,
      color: '#92400e',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', flexShrink: 0 }} />
      Market data provided by Yahoo Finance is delayed by approximately 15 minutes. Data is for informational purposes only.
    </div>
  );
}

export function LegalDisclaimer() {
  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 11,
      color: '#64748b',
      lineHeight: 1.6,
      marginTop: 24,
    }}>
      <span style={{ fontWeight: 700, color: '#475569' }}>Important Disclaimer: </span>
      MorningTrade is a market data and analytics platform intended solely for informational and educational purposes.
      Nothing on this platform constitutes investment advice, a recommendation, solicitation, or offer to buy or sell
      any financial instrument or security. All screeners, signals, indicators, and data displayed are algorithmic
      outputs based on publicly available market data and do not account for your individual financial situation,
      objectives, or risk tolerance. Past performance of any stock, sector, or indicator is not indicative of future
      results. Trading financial instruments involves significant risk and you may lose more than your initial investment.
      MorningTrade does not hold any regulatory licence under MiFID II, the Polish Financial Supervision Authority (KNF),
      the German Federal Financial Supervisory Authority (BaFin), or any other financial regulatory body.
      Always conduct your own research and consult a qualified financial adviser before making any investment decisions.
      By using this platform you confirm that you understand and accept these terms.
    </div>
  );
}

export default function DataDisclaimer() {
  return <DelayBanner />;
}