import { useState, useEffect } from 'react';
import { Loader, ShieldAlert } from 'lucide-react';
import pb from '../pocketbase';

const GoogleIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleIcon = ({ size, fill }) => (
  <svg width={size} height={size} viewBox="0 0 384 512" fill={fill}>
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

export default function AuthView({ onAuthSuccess }) {
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [authMethods, setAuthMethods] = useState(null);

  useEffect(() => {
    // Pre-fetch auth methods to make login instant
    pb.collection('users').listAuthMethods().then(methods => {
      setAuthMethods(methods);
    }).catch(console.error);
  }, []);

  const handleAppleAuth = async () => {
    try {
      setLoadingApple(true);
      const methods = authMethods || await pb.collection('users').listAuthMethods();
      const provider = methods.oauth2.providers.find(p => p.name === 'apple');
      if (!provider) throw new Error('Apple login not configured');
      
      const redirectUrl = window.location.origin + window.location.pathname;
      const providerStr = JSON.stringify({ ...provider, redirectUrl });
      localStorage.setItem('oauth_provider', providerStr);
      document.cookie = `oauth_provider=${encodeURIComponent(providerStr)}; path=/; max-age=600`;
      window.location.href = provider.authUrl + encodeURIComponent(redirectUrl);
    } catch(err) {
      alert(err.message);
      setLoadingApple(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoadingGoogle(true);
      const methods = authMethods || await pb.collection('users').listAuthMethods();
      const provider = methods.oauth2.providers.find(p => p.name === 'google');
      if (!provider) throw new Error('Google login not configured');

      const redirectUrl = window.location.origin + window.location.pathname;
      const providerStr = JSON.stringify({ ...provider, redirectUrl });
      localStorage.setItem('oauth_provider', providerStr);
      document.cookie = `oauth_provider=${encodeURIComponent(providerStr)}; path=/; max-age=600`;
      window.location.href = provider.authUrl + encodeURIComponent(redirectUrl);
    } catch(err) {
      alert(err.message);
      setLoadingGoogle(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)' }}>
      <div className="slurp-shield-container" style={{ transform: 'scale(0.8)', marginBottom: 20 }}>
        <div className="slurp-shield-outline">
          <div className="slurp-shield-fill" style={{ animation: 'none', height: '60%' }} />
        </div>
        <ShieldAlert size={40} color="#fff" style={{ position: 'absolute', zIndex: 10 }} />
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '"Anton", sans-serif', textShadow: '0 0 20px rgba(0, 240, 255, 0.5)', marginBottom: 40 }}>
        CaisterPlayz
      </h1>

      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <button
          onClick={handleAppleAuth}
          disabled={loadingApple || loadingGoogle}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            background: '#fff',
            color: '#000',
            fontSize: 16,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
        >
          {loadingApple ? <Loader size={20} className="spin" /> : <AppleIcon size={20} fill="#000" />}
          Sign in with Apple
        </button>

        <button
          onClick={handleGoogleAuth}
          disabled={loadingGoogle || loadingApple}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            background: '#fff',
            color: '#000',
            fontSize: 16,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
        >
          {loadingGoogle ? <Loader size={20} className="spin" /> : <GoogleIcon size={20} />}
          Continue with Google
        </button>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}
