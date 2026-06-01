import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../utils/supabase';

export default function AuthSuccess() {
  var navigate = useNavigate();

  useEffect(function() {
    supabase.auth.getSession().then(function({ data: { session } }) {
      if (session) {
        navigate('/');
      } else {
        navigate('/login');
      }
    });
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center', color: '#f1f5f9' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
        <p style={{ color: '#64748b' }}>Signing you in...</p>
      </div>
    </div>
  );
}
