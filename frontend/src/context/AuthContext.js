import { createContext, useContext, useState, useEffect } from 'react';

var AuthContext = createContext(null);

export function AuthProvider({ children }) {
  var [user, setUser]       = useState(null);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    var stored = localStorage.getItem('mt_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch(e) {
        localStorage.removeItem('mt_user');
      }
    }
    setLoading(false);
  }, []);

  function login(token) {
    var newUser = { name: 'User', plan: 'free', countries: [], token: token };
    localStorage.setItem('mt_token', token);
    localStorage.setItem('mt_user', JSON.stringify(newUser));
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('mt_token');
    localStorage.removeItem('mt_user');
    setUser(null);
  }

  function hasAccess(country) {
    if (!user) return false;
    if (user.plan === 'global' || user.plan === 'admin') return true;
    if (user.plan === 'country' && user.countries && user.countries.includes(country)) return true;
    return false;
  }

  function isFree() {
    return !user || user.plan === 'free';
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasAccess, isFree }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}