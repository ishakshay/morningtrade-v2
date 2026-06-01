import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  var { user, loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  var navigate = useNavigate();
  var [mode, setMode]       = useState('login'); // login | signup
  var [email, setEmail]     = useState('');
  var [password, setPassword] = useState('');
  var [name, setName]       = useState('');
  var [error, setError]     = useState('');
  var [loading, setLoading] = useState(false);
  var [message, setMessage] = useState('');

  useEffect(function() {
    if (user) navigate('/');
  }, [user, navigate]);

  async function handleEmail(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        navigate('/');
      } else {
        await signupWithEmail(email, password, name);
        setMessage('Check your email to confirm your account.');
      }
    } catch(err) {
      setError(err.message || 'Something went wrong');
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setError('');
    try {
      await loginWithGoogle();
    } catch(err) {
      setError(err.message || 'Google login failed');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', margin: '0 0 8px' }}>
            Morning<span style={{ color: '#60a5fa' }}>Trade</span>
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Indian & European market analytics
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', margin: '0 0 20px', textAlign: 'center' }}>
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </h2>

          {/* Google */}
          <button
            onClick={handleGoogle}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8, marginBottom: 16,
              background: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 14, fontWeight: 600, color: '#1e293b',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
            <span style={{ fontSize: 12, color: '#475569' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#1e293b' }} />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail}>
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={function(e) { setName(e.target.value); }}
                required
                style={{ width: '100%', padding: '10px 12px', marginBottom: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              />
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={function(e) { setEmail(e.target.value); }}
              required
              style={{ width: '100%', padding: '10px 12px', marginBottom: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={function(e) { setPassword(e.target.value); }}
              required
              style={{ width: '100%', padding: '10px 12px', marginBottom: 16, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
            />

            {error && <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}
            {message && <p style={{ color: '#4ade80', fontSize: 13, margin: '0 0 12px', textAlign: 'center' }}>{message}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 8,
                background: '#3b82f6', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 600, color: '#fff', opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#64748b' }}>
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <span
              onClick={function() { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}
              style={{ color: '#60a5fa', cursor: 'pointer', fontWeight: 600 }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </span>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: '#334155' }}>
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
