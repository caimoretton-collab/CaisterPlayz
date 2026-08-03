import { useState, useEffect } from 'react';
import { Radio, Search, User, ListMusic, PlusCircle, ShieldAlert, MessageSquare } from 'lucide-react';
import pb from './pocketbase';
import { applyTheme } from './utils';

// New Music Views
import ListenNowView from './components/ListenNowView';
import LibraryView from './components/LibraryView';
import UploadView from './components/UploadView';
import SearchView from './components/SearchView';
import MusicPlayer from './components/MusicPlayer';
import ProfileView from './components/ProfileView';
import AuthView from './components/AuthView';
import { useAllUsers, useSystemConfig, useUserProfile } from './hooks';

export default function App() {
  const [tab, setTab] = useState('listen_now');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userId, setUserId] = useState(pb.authStore.model?.id || null);
  const [booting, setBooting] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  
  // Track playlist (simple for now - just play whatever is passed)
  const [playlist, setPlaylist] = useState([]);

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const state = urlParams.get('state');
      const code = urlParams.get('code');

      if (state && code) {
        try {
          let providerStr = localStorage.getItem('oauth_provider');
          if (!providerStr) {
            const match = document.cookie.match(new RegExp('(^| )oauth_provider=([^;]+)'));
            if (match) providerStr = decodeURIComponent(match[2]);
          }

          if (providerStr) {
            localStorage.removeItem('oauth_provider');
            document.cookie = 'oauth_provider=; Max-Age=0; path=/';
            
            const provider = JSON.parse(providerStr);
            const redirectUrl = provider.redirectUrl || (window.location.origin + window.location.pathname);
            
            const authData = await pb.collection('users').authWithOAuth2Code(
              provider.name,
              code,
              provider.codeVerifier,
              redirectUrl,
              { displayName: 'Operator' }
            );
            
            if (authData.record.displayName === 'Operator' && authData.meta?.name) {
              await pb.collection('users').update(authData.record.id, { displayName: authData.meta.name });
            }
            
            setUserId(authData.record.id);
          }
        } catch (e) {
          console.error('OAuth callback failed', e);
        } finally {
          window.history.replaceState(null, '', window.location.pathname);
          setBooting(false);
        }
      }
    };
    handleOAuthRedirect();

    const adminEmails = ['caismoretton@gmail.com', 'nexusnpc0@gmail.com'];
    
    const unsub = pb.authStore.onChange((token, model) => {
      setUserId(model?.id || null);
      if (model?.email && adminEmails.includes(model.email.toLowerCase())) {
        setIsAdmin(true);
      }
    }, true);

    if (pb.authStore.model?.email && adminEmails.includes(pb.authStore.model.email.toLowerCase())) {
      setIsAdmin(true);
    }

    if (!window.location.search.includes('code=')) {
      setTimeout(() => setBooting(false), 500);
    }
    
    return () => unsub();
  }, []);

  const users = useAllUsers();
  const { profile: me } = useUserProfile(userId);

  const goTab = (t) => {
    if (tab === t) return;
    if (navigator.vibrate) navigator.vibrate(8);
    setTab(t);
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handlePlayTrack = (track) => {
    setCurrentTrack(track);
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ff9500] to-[#ff3b30] flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(255,149,0,0.4)]">
          <span className="text-black font-black text-3xl font-['Anton'] tracking-tighter">CP</span>
        </div>
      </div>
    );
  }

  if (!userId) {
    return <AuthView onAuthSuccess={(id) => setUserId(id)} />;
  }

  const NAV = [
    { id: 'listen_now', icon: Radio, label: 'Listen Now' },
    { id: 'library', icon: ListMusic, label: 'Library' },
    { id: 'upload', icon: PlusCircle, label: 'Upload' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="console bg-black min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#0c0c0c]/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#ff9500] to-[#ff3b30] flex items-center justify-center shadow-[0_0_20px_rgba(255,149,0,0.3)]">
            <span className="text-black font-black text-sm font-['Anton'] tracking-tighter">CP</span>
          </div>
          <span className="font-['Anton'] text-lg tracking-wide uppercase text-white">Music</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto relative">
        <div className={`h-full transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          {tab === 'listen_now' && <ListenNowView currentUserId={userId} onPlayTrack={handlePlayTrack} />}
          {tab === 'library' && <LibraryView currentUserId={userId} onPlayTrack={handlePlayTrack} />}
          {tab === 'upload' && <UploadView currentUserId={userId} onUploadSuccess={() => goTab('library')} />}
          
          {tab === 'search' && (
            <SearchView 
              currentUserId={userId} 
              onPlayTrack={handlePlayTrack}
              onProfileClick={(uid) => { /* Optional: Navigate to profile */ }} 
            />
          )}
          
          {tab === 'profile' && (
            <ProfileView 
              profile={me} 
              currentUserId={userId} 
              posts={[]} 
              users={users} 
              followData={{followers:[], following:[]}} 
              config={{}} 
            />
          )}

        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] bg-[#0c0c0c]/90 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] z-50">
        <div className="flex justify-around items-center h-[60px]">
          {NAV.map(n => {
            const Icon = n.icon;
            const isActive = tab === n.id;
            return (
              <button 
                key={n.id} 
                onClick={() => goTab(n.id)}
                className={`flex flex-col items-center gap-1 w-16 transition-colors ${isActive ? 'text-[#ff9500]' : 'text-white/40 hover:text-white/80'}`}
              >
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[9px] font-semibold">{n.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Persistent Music Player */}
      <MusicPlayer 
        track={currentTrack} 
        currentUserId={userId}
        onNext={() => {}} // Can implement queue logic later
        onPrev={() => {}}
      />
    </div>
  );
}
