import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthSuccess() {
  var { login } = useAuth();
  var navigate  = useNavigate();

  useEffect(function() {
    var params = new URLSearchParams(window.location.search);
    var token  = params.get('token');
    if (token) {
      login(token);
      navigate('/');
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748b', fontSize: 14 }}>Signing you in...</p>
    </div>
  );
}
