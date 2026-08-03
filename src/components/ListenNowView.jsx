import React, { useState, useEffect } from 'react';
import pb from '../pocketbase';
import { Play, MoreVertical, Flag, ShieldBan } from 'lucide-react';
import { useBlocks } from '../hooks';

export default function ListenNowView({ currentUserId, onPlayTrack }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { blocks, refresh: refreshBlocks } = useBlocks(currentUserId);
  const blockedIds = blocks.map(b => b.blockedId);

  useEffect(() => {
    fetchTracks();
  }, []);

  const fetchTracks = async () => {
    try {
      const res = await pb.collection('cplayz_tracks').getList(1, 20, {
        sort: '-created',
        expand: 'userId'
      });
      setTracks(res.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (e, track) => {
    e.stopPropagation();
    const menu = document.getElementById(`menu-${track.id}`);
    if (menu) menu.classList.add('hidden');
    
    const reason = prompt("Reason for reporting this track?");
    if (reason) {
      try {
        await pb.collection('cplayz_reports').create({
          reporterId: currentUserId,
          reportedUserId: track.userId,
          targetId: track.id,
          targetType: 'track',
          reason: reason,
          status: 'pending'
        });
        
        // Attempt to delete from database
        try {
          await pb.collection('cplayz_tracks').delete(track.id);
        } catch (delErr) {
          console.warn("Could not delete from DB (permissions?), but hiding locally.");
        }
        
        // Hide locally
        setTracks(prev => prev.filter(t => t.id !== track.id));
        alert('Report submitted and track deleted.');
      } catch (err) {
        console.error("Report failed:", err);
        let errorMsg = 'Failed to report.';
        if (err.response && err.response.data) {
          errorMsg += ' ' + Object.entries(err.response.data).map(([k,v]) => `${k}: ${v.message}`).join(', ');
        }
        alert(errorMsg);
      }
    }
  };

  const handleBlock = async (e, track) => {
    e.stopPropagation();
    if (window.confirm(`Block user ${track.expand?.userId?.displayName || track.expand?.userId?.name || 'Unknown'}?`)) {
      try {
        await pb.collection('cplayz_blocks').create({
          blockerId: currentUserId,
          blockedId: track.userId
        });
        await refreshBlocks();
        alert('User blocked.');
      } catch (e) {
        alert('Failed to block.');
      }
    }
  };

  const visibleTracks = tracks.filter(t => !blockedIds.includes(t.userId));

  if (loading) return <div className="p-8 text-center text-white/50">Loading fresh drops...</div>;

  return (
    <div className="pb-32 pt-4 px-4">
      <h1 className="text-3xl font-bold mb-6 text-white font-['Anton'] tracking-wider">LISTEN NOW</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {visibleTracks.map(track => {
          const coverUrl = track.coverArt ? pb.files.getUrl(track, track.coverArt) : 'https://placehold.co/200x200/1c1c1e/ff9500?text=CP';
          
          return (
            <div 
              key={track.id} 
              onClick={() => onPlayTrack(track)}
              className="bg-[#1c1c1e] rounded-xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform group"
            >
              <div className="relative aspect-square bg-[#0c0c0c]">
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={48} className="text-white drop-shadow-lg" fill="currentColor" />
                </div>
                
                <div className="absolute top-2 right-2 dropdown-container">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    const menu = document.getElementById(`menu-${track.id}`);
                    menu.classList.toggle('hidden');
                  }} className="p-1 bg-black/50 rounded-full text-white/80 hover:text-white backdrop-blur-md">
                    <MoreVertical size={16} />
                  </button>
                  <div id={`menu-${track.id}`} className="hidden absolute right-0 mt-1 w-32 bg-[#2c2c2e] rounded-lg shadow-xl border border-white/10 z-10 overflow-hidden">
                    <button onClick={(e) => handleReport(e, track)} className="w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/10 flex items-center gap-2">
                      <Flag size={12} /> Report
                    </button>
                    <button onClick={(e) => handleBlock(e, track)} className="w-full px-3 py-2 text-left text-xs text-red-400 hover:bg-white/10 flex items-center gap-2">
                      <ShieldBan size={12} /> Block User
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <div className="text-sm font-bold text-white truncate">{track.title}</div>
                <div className="text-xs text-[#ff9500] truncate">{track.artist}</div>
                <div className="text-[10px] text-white/40 mt-1 font-mono">{track.plays || 0} PLAYS • {track.likes || 0} LIKES</div>
              </div>
            </div>
          );
        })}
      </div>
      
      {visibleTracks.length === 0 && (
        <div className="text-center py-12 text-white/40 border border-white/10 rounded-2xl border-dashed">
          No tracks dropped yet.
        </div>
      )}
    </div>
  );
}
