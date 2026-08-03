import React, { useState, useEffect } from 'react';
import pb from '../pocketbase';
import { Play, Music } from 'lucide-react';

import { useBlocks } from '../hooks';

export default function LibraryView({ currentUserId, onPlayTrack }) {
  const [myTracks, setMyTracks] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);
  const [tab, setTab] = useState('uploads'); // 'uploads' or 'likes'
  const [loading, setLoading] = useState(true);

  const { blocks } = useBlocks(currentUserId);
  const blockedIds = blocks.map(b => b.blockedId);

  useEffect(() => {
    if (currentUserId) {
      fetchLibrary();
    }
  }, [currentUserId]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const [uploadsRes, likesRes] = await Promise.all([
        pb.collection('cplayz_tracks').getFullList({
          filter: `userId="${currentUserId}"`,
          sort: '-created'
        }),
        pb.collection('cplayz_track_likes').getFullList({
          filter: `userId="${currentUserId}"`,
          expand: 'trackId,trackId.userId',
          sort: '-created'
        })
      ]);
      setMyTracks(uploadsRes);
      setLikedTracks(likesRes.map(l => l.expand?.trackId).filter(Boolean));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const tracksToShowRaw = tab === 'uploads' ? myTracks : likedTracks;
  const tracksToShow = tracksToShowRaw.filter(t => !blockedIds.includes(t.userId));

  if (loading) return <div className="p-8 text-center text-white/50">Loading library...</div>;

  return (
    <div className="pb-32 pt-4 px-4">
      <h1 className="text-3xl font-bold mb-4 text-white font-['Anton'] tracking-wider">LIBRARY</h1>
      
      <div className="flex bg-[#1c1c1e] p-1 rounded-xl mb-6">
        <button 
          onClick={() => setTab('uploads')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'uploads' ? 'bg-[#ff9500] text-black' : 'text-white/50 hover:text-white'}`}
        >
          My Uploads
        </button>
        <button 
          onClick={() => setTab('likes')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${tab === 'likes' ? 'bg-[#ff9500] text-black' : 'text-white/50 hover:text-white'}`}
        >
          Liked Tracks
        </button>
      </div>

      <div className="space-y-2">
        {tracksToShow.map(track => {
          const coverUrl = track.coverArt ? pb.files.getUrl(track, track.coverArt) : 'https://placehold.co/100x100/1c1c1e/ff9500?text=CP';
          return (
            <div 
              key={track.id} 
              onClick={() => onPlayTrack(track)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#1c1c1e] cursor-pointer transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-[#0c0c0c] overflow-hidden relative flex-shrink-0">
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={20} className="text-white drop-shadow-md" fill="currentColor" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{track.title}</div>
                <div className="text-xs text-[#ff9500] truncate">{track.artist}</div>
              </div>
              <div className="text-xs text-white/30 font-mono pr-2">
                {track.plays || 0} p
              </div>
            </div>
          );
        })}
      </div>

      {tracksToShow.length === 0 && (
        <div className="text-center py-16 flex flex-col items-center justify-center opacity-50">
          <Music size={48} className="mb-4" />
          <p className="text-sm font-bold">Nothing here yet.</p>
        </div>
      )}
    </div>
  );
}
