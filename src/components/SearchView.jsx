import React, { useState, useEffect } from 'react';
import { Search, Play, User } from 'lucide-react';
import pb from '../pocketbase';
import { useBlocks } from '../hooks';

export default function SearchView({ currentUserId, onPlayTrack, onProfileClick }) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tracks'); // 'tracks' or 'artists'
  
  const { blocks } = useBlocks(currentUserId);
  const blockedIds = blocks.map(b => b.blockedId);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setTracks([]);
      setUsers([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const [trackRes, userRes] = await Promise.all([
          pb.collection('cplayz_tracks').getList(1, 20, {
            filter: `title ~ "${debouncedQuery}" || artist ~ "${debouncedQuery}"`,
            expand: 'userId'
          }),
          pb.collection('users').getList(1, 20, {
            filter: `displayName ~ "${debouncedQuery}" || username ~ "${debouncedQuery}"`
          })
        ]);
        
        // Filter out blocked users
        const filteredTracks = trackRes.items.filter(t => !blockedIds.includes(t.userId));
        const filteredUsers = userRes.items.filter(u => !blockedIds.includes(u.id));

        setTracks(filteredTracks);
        setUsers(filteredUsers);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  return (
    <div className="pb-32 pt-4 px-4 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-white font-['Anton'] tracking-wider">SEARCH</h1>
      
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search size={20} className="text-white/50" />
        </div>
        <input
          type="text"
          className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder-white/50 focus:outline-none focus:border-[#ff9500] transition-colors shadow-lg"
          placeholder="Artists, songs, or albums"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <div className="w-4 h-4 border-2 border-[#ff9500] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1c1c1e] p-1 rounded-xl mb-6 shadow-md">
        <button 
          onClick={() => setActiveTab('tracks')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'tracks' ? 'bg-[#ff9500] text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
        >
          Tracks
        </button>
        <button 
          onClick={() => setActiveTab('artists')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'artists' ? 'bg-[#ff9500] text-black shadow-sm' : 'text-white/50 hover:text-white'}`}
        >
          Artists
        </button>
      </div>

      {/* Results area */}
      <div className="space-y-4">
        {!debouncedQuery.trim() ? (
          <div className="text-center py-12 text-white/30 font-bold text-sm">
            Discover new heat.
          </div>
        ) : (
          <>
            {activeTab === 'tracks' && (
              tracks.length === 0 && !loading ? (
                <div className="text-center py-8 text-white/50 text-sm">No tracks found.</div>
              ) : (
                <div className="grid gap-3">
                  {tracks.map(track => {
                    const coverUrl = track.coverArt ? pb.files.getUrl(track, track.coverArt) : 'https://placehold.co/100x100/1c1c1e/ff9500?text=CP';
                    return (
                      <div 
                        key={track.id} 
                        onClick={() => onPlayTrack(track)}
                        className="flex items-center gap-4 p-2 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] cursor-pointer transition-colors group border border-white/5"
                      >
                        <div className="w-14 h-14 rounded-lg bg-black overflow-hidden relative flex-shrink-0">
                          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play size={20} className="text-white drop-shadow-md" fill="currentColor" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-white truncate">{track.title}</div>
                          <div className="text-sm text-[#ff9500] truncate">{track.artist}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {activeTab === 'artists' && (
              users.length === 0 && !loading ? (
                <div className="text-center py-8 text-white/50 text-sm">No artists found.</div>
              ) : (
                <div className="grid gap-3">
                  {users.map(user => {
                    const initial = (user.displayName || user.username || '?')[0].toUpperCase();
                    return (
                      <div 
                        key={user.id} 
                        onClick={() => { if (onProfileClick) onProfileClick(user.id); }}
                        className="flex items-center gap-4 p-3 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] cursor-pointer transition-colors border border-white/5"
                      >
                        <div className="w-14 h-14 rounded-full bg-[#2c2c2e] border-2 border-black overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white/50 font-bold text-xl">{initial}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-white truncate">{user.displayName || user.username}</div>
                          <div className="text-xs text-white/50 uppercase tracking-widest mt-0.5">Artist</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
