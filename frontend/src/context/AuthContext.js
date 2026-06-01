import { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../utils/supabase';

var AuthContext = createContext(null);

export function AuthProvider({ children }) {
  var [user, setUser]       = useState(null);
  var [profile, setProfile] = useState(null);
  var [loading, setLoading] = useState(true);

  async function fetchProfile(userId) {
    try {
      var { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) {
        setProfile(data);
        // Update last_login and login_count
        await supabase.from('profiles').update({
          last_login: new Date().toISOString(),
          login_count: (data.login_count || 0) + 1
        }).eq('id', userId);
      }
    } catch(e) {
      console.error('fetchProfile error:', e);
    }
  }

  useEffect(function() {
    // Get initial session
    supabase.auth.getSession().then(function({ data: { session } }) {
      setUser(session?.user || null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    // Listen for auth changes
    var { data: { subscription } } = supabase.auth.onAuthStateChange(function(event, session) {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return function() { subscription.unsubscribe(); };
  }, []);

  async function loginWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/success'
      }
    });
  }

  async function loginWithEmail(email, password) {
    var { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signupWithEmail(email, password, name) {
    var { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  function hasAccess(country) {
    if (!profile) return true; // everyone can view
    if (profile.blocked) return false;
    if (profile.plan === 'global' || profile.plan === 'admin') return true;
    if (profile.plan === 'country' && profile.countries && profile.countries.includes(country)) return true;
    return true; // free users can view everything for now
  }

  function isAdmin() {
    return profile?.plan === 'admin';
  }

  function isFree() {
    return !profile || profile.plan === 'free';
  }

  // Build user object compatible with existing app code
  var combinedUser = user ? {
    id:        user.id,
    email:     user.email,
    name:      profile?.name || user.email,
    plan:      profile?.plan || 'free',
    countries: profile?.countries || [],
    token:     user.id,
    blocked:   profile?.blocked || false,
  } : null;

  return (
    <AuthContext.Provider value={{
      user: combinedUser,
      profile,
      loading,
      loginWithGoogle,
      loginWithEmail,
      signupWithEmail,
      logout,
      hasAccess,
      isAdmin,
      isFree,
      // Keep login() for backward compat
      login: loginWithEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
