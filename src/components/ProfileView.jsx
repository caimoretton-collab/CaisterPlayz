import React, { useState, useRef, useEffect } from 'react';
import { Camera, Check, X, Loader, LogOut, Trash2, ShieldAlert, Shield, ShieldOff, Flag, MoreHorizontal, Play, CheckCircle } from 'lucide-react';
import pb from '../pocketbase';
import { updateProfile, blockUser, unblockUser, toggleFollow, checkIsFollowing, getFollowStats, reportUser, useBlocks } from '../hooks';
import { formatNumber } from '../utils';

function compressAv(file) {
  return new Promise((res, rej) => {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const img = new window.Image();
    img.onload = () => {
      c.width = 200;
      c.height = 200;
      ctx.drawImage(img, 0, 0, 200, 200);
      res(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = rej;
    const r = new FileReader();
    r.onload = e => img.src = e.target.result;
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function ProfileView({ profile, currentUserId, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState('');
  const [eBio, setEBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [followStats, setFollowStats] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(true);

  const fRef = useRef(null);

  useEffect(() => {
    if (profile?.id) {
      getFollowStats(profile.id).then(setFollowStats);
      if (currentUserId && currentUserId !== profile.id) {
        checkIsFollowing(currentUserId, profile.id).then(setIsFollowing);
      }
      fetchUserTracks();
    }
  }, [profile?.id, currentUserId]);

  const { blocks, refresh: refreshBlocks } = useBlocks(currentUserId);
  const isBlocked = blocks.some(b => b.blockedId === profile?.id);

  const fetchUserTracks = async () => {
    try {
      const res = await pb.collection('cplayz_tracks').getFullList({
        filter: `userId="${profile.id}"`,
        sort: '-created'
      });
      setTracks(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTracks(false);
    }
  };

  if (!profile) {
    return <div className="p-8 text-center text-white/50">Loading Artist...</div>;
  }

  const isOwn = profile.id === currentUserId;
  const totalPlays = tracks.reduce((acc, t) => acc + (t.plays || 0), 0);
  const totalLikes = tracks.reduce((acc, t) => acc + (t.likes || 0), 0);

  const startEdit = () => {
    setEName(profile.displayName || '');
    setEBio(profile.bio || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!eName.trim()) return;
    setSaving(true);
    try {
      await updateProfile(profile.id, { displayName: eName.trim(), bio: eBio.trim() });
      await onRefresh?.();
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleAv = async e => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSaving(true);
    try {
      const d = await compressAv(f);
      await updateProfile(profile.id, { avatarUrl: d });
      await onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
      if (fRef.current) fRef.current.value = '';
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUserId || isOwn || followLoading) return;
    setFollowLoading(true);
    try {
      await toggleFollow(currentUserId, profile.id, isFollowing);
      setIsFollowing(!isFollowing);
      setFollowStats(prev => ({
        ...prev,
        followers: isFollowing ? Math.max(0, prev.followers - 1) : prev.followers + 1
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setFollowLoading(false);
    }
  };

  const initial = (profile.displayName || '?')[0].toUpperCase();

  return (
    <div className="pb-32 min-h-screen bg-black">
      {/* Artist Hero Banner */}
      <div className="relative h-64 w-full bg-[#1c1c1e] overflow-hidden">
        {/* Blurred background from avatar */}
        {profile.avatarUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-2xl transform scale-110"
            style={{ backgroundImage: `url(${profile.avatarUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff9500]/20 to-[#ff3b30]/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 w-full p-6 flex items-end gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-black overflow-hidden bg-[#2c2c2e] shadow-2xl flex items-center justify-center text-3xl font-bold">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white/50">{initial}</span>
              )}
            </div>
            {isOwn && (
              <>
                <button
                  onClick={() => fRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-[#ff9500] rounded-full flex items-center justify-center text-black shadow-lg hover:scale-105 active:scale-95 transition-transform"
                >
                  {saving ? <Loader size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input ref={fRef} type="file" accept="image/*" hidden onChange={handleAv} />
              </>
            )}
          </div>
          
          <div className="flex-1 pb-2">
            {editing ? (
              <div className="space-y-2">
                <input
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:border-[#ff9500]"
                  value={eName}
                  onChange={e => setEName(e.target.value)}
                  maxLength={40}
                  placeholder="Artist Name"
                />
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-2 font-['Anton'] tracking-wide">
                  {profile.displayName}
                  {window.cplayz_config?.verifiedUsers?.includes(profile.id) && (
                    <CheckCircle size={20} className="text-[#ff9500]" />
                  )}
                </h1>
                <div className="text-sm font-bold text-white/50 uppercase tracking-widest mt-1">Artist</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 pt-4">
        {/* Edit Controls / Follow Buttons */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-6 text-sm">
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg">{formatNumber(followStats.followers)}</span>
              <span className="text-white/50 uppercase text-[10px] tracking-wider font-bold">Followers</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg">{formatNumber(followStats.following)}</span>
              <span className="text-white/50 uppercase text-[10px] tracking-wider font-bold">Following</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isOwn ? (
              editing ? (
                <>
                  <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-full bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors">Cancel</button>
                  <button onClick={saveEdit} className="px-4 py-2 rounded-full bg-[#ff9500] text-black font-bold text-xs hover:bg-[#ff9500]/90 transition-colors flex items-center gap-2">
                    {saving ? <Loader size={12} className="animate-spin" /> : 'Save'}
                  </button>
                </>
              ) : (
                <button onClick={startEdit} className="px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors">
                  Edit Profile
                </button>
              )
            ) : (
              <>
                <button 
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`px-6 py-2 rounded-full font-bold text-xs transition-colors ${isFollowing ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-[#ff9500] text-black hover:bg-[#ff9500]/90'}`}
                >
                  {followLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
                </button>
                
                <div className="relative">
                  <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                    <MoreHorizontal size={16} />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1c1c1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                      <button 
                        onClick={() => { setShowMenu(false); setShowReportModal(true); }}
                        className="w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <Flag size={14} /> Report Artist
                      </button>
                      <button 
                        onClick={async () => {
                          setShowMenu(false);
                          setActionLoading(true);
                          if (isBlocked) await unblockUser(currentUserId, profile.id);
                          else await blockUser(currentUserId, profile.id);
                          await refreshBlocks();
                          setActionLoading(false);
                        }}
                        disabled={actionLoading}
                        className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 border-t border-white/5"
                      >
                        {isBlocked ? <Shield size={14} /> : <ShieldOff size={14} />} 
                        {isBlocked ? "Unblock Artist" : "Block Artist"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {editing ? (
          <textarea
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 text-sm focus:outline-none focus:border-[#ff9500] mb-6"
            value={eBio}
            onChange={e => setEBio(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="Artist bio..."
          />
        ) : (
          profile.bio && <p className="text-white/80 text-sm mb-6 leading-relaxed">{profile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex gap-4 mb-8">
          <div className="bg-[#1c1c1e] flex-1 rounded-xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-black text-white">{formatNumber(tracks.length)}</div>
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Tracks</div>
          </div>
          <div className="bg-[#1c1c1e] flex-1 rounded-xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-black text-[#ff9500]">{formatNumber(totalPlays)}</div>
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Plays</div>
          </div>
          <div className="bg-[#1c1c1e] flex-1 rounded-xl p-4 border border-white/5 text-center">
            <div className="text-2xl font-black text-white">{formatNumber(totalLikes)}</div>
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mt-1">Likes</div>
          </div>
        </div>

        {/* Top Tracks */}
        <h2 className="text-xl font-bold text-white mb-4">Latest Releases</h2>
        {loadingTracks ? (
          <div className="text-center py-8 text-white/50 text-sm">Loading tracks...</div>
        ) : tracks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-white/40 text-sm font-bold">
            No tracks released yet.
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track, i) => {
              const coverUrl = track.coverArt ? pb.files.getUrl(track, track.coverArt) : 'https://placehold.co/100x100/1c1c1e/ff9500?text=CP';
              return (
                <div key={track.id} className="flex items-center gap-4 p-2 rounded-xl hover:bg-[#1c1c1e] transition-colors group cursor-pointer">
                  <div className="w-6 text-center text-sm font-bold text-white/30">{i + 1}</div>
                  <div className="w-12 h-12 rounded-lg overflow-hidden relative flex-shrink-0 bg-black">
                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={16} className="text-white" fill="currentColor" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate group-hover:text-[#ff9500] transition-colors">{track.title}</div>
                    <div className="text-xs text-white/50 truncate">{formatNumber(track.plays || 0)} plays</div>
                  </div>
                  {isOwn && (
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete "${track.title}"? This cannot be undone.`)) {
                          try {
                            await pb.collection('cplayz_tracks').delete(track.id);
                            setTracks(prev => prev.filter(t => t.id !== track.id));
                          } catch (err) {
                            console.error(err);
                            alert("Failed to delete track.");
                          }
                        }
                      }}
                      className="p-2 text-white/30 hover:text-red-500 transition-colors rounded-full hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Settings (Own Profile) */}
        {isOwn && (
          <div className="mt-12 pt-6 border-t border-white/10 space-y-3">
            <h3 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-4">Account Settings</h3>
            <button
              onClick={() => {
                if (window.confirm('Sign out of CaisterPlayz?')) {
                  pb.authStore.clear();
                  window.location.reload();
                }
              }}
              className="w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors border border-white/5"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
          <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl p-6 border-t border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Report {profile.displayName}</h3>
              <button onClick={() => setShowReportModal(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-white/50 mb-6">Why are you reporting this artist? Our team reviews all reports.</p>
            <div className="space-y-2">
              {['Copyright Infringement', 'Inappropriate Content', 'Spam', 'Impersonation', 'Other'].map(reason => (
                <button
                  key={reason}
                  onClick={async () => {
                    setShowReportModal(false);
                    setReporting(true);
                    try {
                      await reportUser(currentUserId, profile.id, reason);
                      alert('Report submitted successfully.');
                    } catch (e) {
                      alert('Failed to submit report.');
                    } finally {
                      setReporting(false);
                    }
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-black/50 border border-white/5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
