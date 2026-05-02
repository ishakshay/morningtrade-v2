import React, { useState, useEffect, useRef } from 'react';
import PageTitle from '../components/PageTitle';

var OptionsChainGrid = function() {
  var [symbol, setSymbol] = useState('NIFTY');
  var [dataType, setDataType] = useState('OI');
  var [timeInterval, setTimeInterval] = useState(3);
  var [strikeRange, setStrikeRange] = useState(10);
  var [atmStrike, setAtmStrike] = useState(null);
  var [gridDataCE, setGridDataCE] = useState([]);
  var [gridDataPE, setGridDataPE] = useState([]);
  var [timestamps, setTimestamps] = useState([]);
  var [strikes, setStrikes] = useState([]);
  var [loading, setLoading] = useState(true);
  var [lastUpdate, setLastUpdate] = useState(null);
  var [autoRefresh, setAutoRefresh] = useState(true);
  var [message, setMessage] = useState(null);
  var intervalRef = useRef(null);

  var fetchGridData = function() {
    setLoading(true);
    
    var validInterval = timeInterval || 3;
    
    var promiseCE = fetch('http://localhost:3001/api/options-chain-grid?symbol=' + symbol + '&interval=' + validInterval + '&data_type=' + dataType + '&option_type=CE&strike_range=' + strikeRange)
      .then(function(response) { return response.json(); });
    
    var promisePE = fetch('http://localhost:3001/api/options-chain-grid?symbol=' + symbol + '&interval=' + validInterval + '&data_type=' + dataType + '&option_type=PE&strike_range=' + strikeRange)
      .then(function(response) { return response.json(); });
    
    Promise.all([promiseCE, promisePE])
      .then(function(results) {
        var dataCE = results[0];
        var dataPE = results[1];
        
        if (dataCE.success && dataPE.success) {
          setAtmStrike(dataCE.atm_strike);
          setGridDataCE(dataCE.grid_data);
          setGridDataPE(dataPE.grid_data);
          setTimestamps(dataCE.timestamps);
          setStrikes(dataCE.strikes);
          setLastUpdate(dataCE.last_update);
          setMessage(null);
        } else {
          setMessage(dataCE.message || dataPE.message || 'Failed to load data');
        }
        setLoading(false);
      })
      .catch(function(error) {
        console.error('Error fetching grid data:', error);
        setMessage('Connection error. Make sure Flask backend is running.');
        setLoading(false);
      });
  };

  useEffect(function() {
    fetchGridData();
  }, [symbol, timeInterval, dataType, strikeRange]);

  useEffect(function() {
    if (autoRefresh) {
      intervalRef.current = setInterval(function() {
        fetchGridData();
      }, 60000);
    }

    return function() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, timeInterval, symbol, dataType, strikeRange]);

  var getHeatmapColor = function(value, strikeIndex, timeIndex, optionType) {
    if (!value || value === 0) return 'transparent';
    
    var allValues = optionType === 'CE' 
      ? gridDataCE.flat().filter(function(v) { return v !== null && v !== 0; })
      : gridDataPE.flat().filter(function(v) { return v !== null && v !== 0; });
    
    if (allValues.length === 0) return 'transparent';
    
    var maxVal = Math.max.apply(null, allValues);
    var minVal = Math.min.apply(null, allValues);
    var range = maxVal - minVal;
    
    if (range === 0) return optionType === 'CE' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)';
    
    var normalized = (value - minVal) / range;
    
    if (dataType === 'OI Change') {
      if (value < 0) {
        var intensity = Math.min(Math.abs(normalized), 1);
        return optionType === 'CE' 
          ? 'rgba(34, 197, 94, ' + (0.2 + intensity * 0.6) + ')'
          : 'rgba(239, 68, 68, ' + (0.2 + intensity * 0.6) + ')';
      } else {
        var intensity = Math.min(normalized, 1);
        return optionType === 'CE'
          ? 'rgba(239, 68, 68, ' + (0.2 + intensity * 0.6) + ')'
          : 'rgba(34, 197, 94, ' + (0.2 + intensity * 0.6) + ')';
      }
    } else {
      var intensity = Math.min(normalized, 1);
      return optionType === 'CE'
        ? 'rgba(239, 68, 68, ' + (0.2 + intensity * 0.6) + ')'
        : 'rgba(34, 197, 94, ' + (0.2 + intensity * 0.6) + ')';
    }
  };

  var formatValue = function(value) {
    if (value === null || value === undefined) return '-';
    
    if (Math.abs(value) >= 100000) {
      return (value / 100000).toFixed(2) + ' L';
    } else if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(2) + ' K';
    }
    return value.toFixed(0);
  };

  var formatTimestamp = function(timestamp) {
    var date = new Date(timestamp);
    var hours = date.getHours().toString().padStart(2, '0');
    var minutes = date.getMinutes().toString().padStart(2, '0');
    return hours + ':' + minutes;
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <PageTitle 
        title="Options Chain Grid" 
        subtitle={'Time-series heatmap for ' + symbol + ' options - CE (Red) vs PE (Green)'}
      />

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 10,
        padding: 16,
        background: '#0f172a',
        borderRadius: 8,
        border: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select 
            value={symbol}
            onChange={function(e) { setSymbol(e.target.value); }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            <option value="NIFTY">NIFTY 50</option>
            <option value="BANKNIFTY">BANKNIFTY</option>
          </select>

          <select 
            value={timeInterval}
            onChange={function(e) { 
              var val = parseInt(e.target.value, 10);
              setTimeInterval(val);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            <option value="3">3 min</option>
            <option value="15">15 min</option>
            <option value="30">30 min</option>
            <option value="60">1 hour</option>
          </select>

          <select 
            value={dataType}
            onChange={function(e) { setDataType(e.target.value); }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            <option value="OI">Open Interest</option>
            <option value="OI Change">OI Change</option>
            <option value="Volume">Volume</option>
          </select>

          <select 
            value={strikeRange}
            onChange={function(e) { 
              var val = parseInt(e.target.value, 10);
              setStrikeRange(val);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            <option value="5">ATM ± 5</option>
            <option value="7">ATM ± 7</option>
            <option value="10">ATM ± 10</option>
            <option value="15">ATM ± 15</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={function() { setAutoRefresh(!autoRefresh); }}
            style={{
              padding: '8px 16px',
              backgroundColor: autoRefresh ? '#3b82f6' : '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸ Auto-refresh OFF'}
          </button>

          <button
            onClick={fetchGridData}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {!message && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          backgroundColor: '#0f172a',
          borderRadius: 6,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: 12,
          border: '1px solid #1e293b'
        }}>
          <div>
            <span style={{ color: '#64748b' }}>ATM Strike: </span>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>{atmStrike || '-'}</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Strike Range: </span>
            <span style={{ color: '#4ade80' }}>ATM ± {strikeRange}</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Snapshots: </span>
            <span style={{ color: '#4ade80' }}>{timestamps.length}</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Last Update: </span>
            <span style={{ color: '#4ade80' }}>{lastUpdate || '-'}</span>
          </div>
        </div>
      )}

      {message && (
        <div style={{
          padding: 20,
          backgroundColor: '#1e293b',
          borderRadius: 8,
          border: '1px solid #334155',
          textAlign: 'center',
          marginBottom: 20
        }}>
          <p style={{ color: '#f59e0b', fontSize: 14, margin: 0 }}>{message}</p>
          <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>
            Data is collected every 3 minutes during market hours (9:15 AM - 3:30 PM IST)
          </p>
        </div>
      )}

      {!message && timestamps.length > 0 && (
        <div style={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 280px)',
          backgroundColor: '#0f172a',
          borderRadius: 8,
          border: '1px solid #1e293b'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 9
          }}>
            <thead>
              <tr>
                <th colSpan={timestamps.length} style={{
                  padding: 6,
                  backgroundColor: '#450a0a',
                  border: '1px solid #991b1b',
                  color: '#fca5a5',
                  fontWeight: 700,
                  fontSize: 11,
                  textAlign: 'center'
                }}>
                  Call (Lot)
                </th>
                
                <th style={{
                  position: 'sticky',
                  left: 'auto',
                  top: 0,
                  zIndex: 4,
                  padding: 6,
                  backgroundColor: '#0f172a',
                  border: '2px solid #4ade80',
                  color: '#4ade80',
                  fontWeight: 700,
                  minWidth: 70,
                  fontSize: 11
                }}>
                  Strike
                </th>
                
                <th colSpan={timestamps.length} style={{
                  padding: 6,
                  backgroundColor: '#052e16',
                  border: '1px solid #166534',
                  color: '#86efac',
                  fontWeight: 700,
                  fontSize: 11,
                  textAlign: 'center'
                }}>
                  Put (Lot)
                </th>
              </tr>
              
              <tr>
                {timestamps.map(function(timestamp, index) {
                  return (
                    <th key={'ce-' + index} style={{
                      position: 'sticky',
                      top: 41,
                      zIndex: 2,
                      padding: '4px 3px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #450a0a',
                      color: '#fca5a5',
                      fontWeight: 600,
                      minWidth: 50,
                      textAlign: 'center',
                      fontSize: 9
                    }}>
                      {formatTimestamp(timestamp)}
                    </th>
                  );
                })}
                
                <th style={{
                  position: 'sticky',
                  top: 41,
                  zIndex: 3,
                  padding: 6,
                  backgroundColor: '#0f172a',
                  border: '2px solid #4ade80',
                  color: '#4ade80',
                  fontWeight: 700,
                  minWidth: 70
                }}>
                  Strike
                </th>
                
                {timestamps.slice().reverse().map(function(timestamp, index) {
                  return (
                    <th key={'pe-' + index} style={{
                      position: 'sticky',
                      top: 41,
                      zIndex: 2,
                      padding: '4px 3px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #052e16',
                      color: '#86efac',
                      fontWeight: 600,
                      minWidth: 50,
                      textAlign: 'center',
                      fontSize: 9
                    }}>
                      {formatTimestamp(timestamp)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {strikes.map(function(strike, strikeIndex) {
                var isATM = strike === atmStrike;
                return (
                  <tr key={strike}>
                    {gridDataCE[strikeIndex] && gridDataCE[strikeIndex].map(function(value, timeIndex) {
                      return (
                        <td key={'ce-' + timeIndex} style={{
                          padding: '4px 3px',
                          backgroundColor: getHeatmapColor(value, strikeIndex, timeIndex, 'CE'),
                          border: '1px solid #1e293b',
                          textAlign: 'right',
                          color: value < 0 ? '#86efac' : '#fca5a5',
                          fontWeight: Math.abs(value) > 50000 ? 600 : 400,
                          fontSize: 9
                        }}>
                          {formatValue(value)}
                        </td>
                      );
                    })}
                    
                    <td style={{
                      position: 'sticky',
                      left: 'auto',
                      zIndex: 1,
                      padding: 6,
                      backgroundColor: isATM ? '#1e3a1e' : '#0f172a',
                      border: isATM ? '2px solid #4ade80' : '1px solid #1e293b',
                      color: isATM ? '#4ade80' : '#f1f5f9',
                      fontWeight: isATM ? 700 : 600,
                      textAlign: 'center',
                      fontSize: isATM ? 11 : 10,
                      minWidth: 70
                    }}>
                      {strike} {isATM ? '🎯' : ''}
                    </td>
                    
                    {gridDataPE[strikeIndex] && gridDataPE[strikeIndex].slice().reverse().map(function(value, timeIndex) {
                      return (
                        <td key={'pe-' + timeIndex} style={{
                          padding: '4px 3px',
                          backgroundColor: getHeatmapColor(value, strikeIndex, timeIndex, 'PE'),
                          border: '1px solid #1e293b',
                          textAlign: 'right',
                          color: value < 0 ? '#fca5a5' : '#86efac',
                          fontWeight: Math.abs(value) > 50000 ? 600 : 400,
                          fontSize: 9
                        }}>
                          {formatValue(value)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!message && timestamps.length > 0 && (
        <div style={{
          marginTop: 16,
          padding: 12,
          backgroundColor: '#0f172a',
          borderRadius: 6,
          fontSize: 11,
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 15,
          border: '1px solid #1e293b'
        }}>
          <div>
            <span style={{ color: '#fca5a5' }}>■</span>
            <span style={{ color: '#64748b' }}> CE (Call) - Red | </span>
            <span style={{ color: '#86efac' }}>■</span>
            <span style={{ color: '#64748b' }}> PE (Put) - Green</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>🎯 = ATM Strike</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>Darker Color = Higher Value</span>
          </div>
          <div>
            <span style={{ color: '#64748b' }}>L = Lakh (100K) | K = Thousand</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionsChainGrid;