import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, Heart, MessageCircle, AlignLeft } from 'lucide-react';
import pb from '../pocketbase';

export default function MusicPlayer({ track, onNext, onPrev, currentUserId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLyricsMode, setIsLyricsMode] = useState(false);
  const audioRef = useRef(null);
  const [hasLoggedPlay, setHasLoggedPlay] = useState(false);
  
  // Engagement
  const [likes, setLikes] = useState(track?.likes || 0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (track) {
      setHasLoggedPlay(false);
      setLikes(track.likes || 0);
      checkIfLiked();
      if (audioRef.current) {
        audioRef.current.src = pb.files.getUrl(track, track.audioFile);
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  }, [track]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const checkIfLiked = async () => {
    if (!track || !currentUserId) return;
    try {
      const res = await pb.collection('cplayz_track_likes').getFullList({
        filter: `userId="${currentUserId}" && trackId="${track.id}"`
      });
      setIsLiked(res.length > 0);
    } catch (e) {
      console.error('Error checking like status', e);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      setProgress(current);
      
      // Log play after 10 seconds
      if (current > 10 && !hasLoggedPlay && track) {
        setHasLoggedPlay(true);
        pb.collection('cplayz_tracks').update(track.id, { plays: (track.plays || 0) + 1 }).catch(() => {});
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const toggleLike = async (e) => {
    e.stopPropagation();
    if (!currentUserId || !track) return;
    
    try {
      if (isLiked) {
        const res = await pb.collection('cplayz_track_likes').getFullList({
          filter: `userId="${currentUserId}" && trackId="${track.id}"`
        });
        if (res[0]) {
          await pb.collection('cplayz_track_likes').delete(res[0].id);
          setIsLiked(false);
          setLikes(prev => Math.max(0, prev - 1));
          await pb.collection('cplayz_tracks').update(track.id, { likes: Math.max(0, likes - 1) });
        }
      } else {
        await pb.collection('cplayz_track_likes').create({
          userId: currentUserId,
          trackId: track.id
        });
        setIsLiked(true);
        setLikes(prev => prev + 1);
        await pb.collection('cplayz_tracks').update(track.id, { likes: likes + 1 });
      }
    } catch (e) {
      console.error('Error toggling like', e);
    }
  };

  const seek = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    if (audioRef.current) {
      const newTime = ratio * duration;
      audioRef.current.currentTime = newTime;
      setProgress(newTime);
    }
  };

  const formatTime = (sec) => {
    if (isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!track) return null;

  const coverUrl = track.coverArt ? pb.files.getUrl(track, track.coverArt) : 'https://placehold.co/400x400/1c1c1e/ff9500?text=CP';

  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col p-6 pb-12 animate-in slide-in-from-bottom-full duration-300">
        <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={onNext} />
        
        <div className="flex justify-between items-center mb-8 pt-4">
          <button onClick={() => setIsExpanded(false)} className="p-2 text-white/70 hover:text-white">
            <Minimize2 size={24} />
          </button>
          <div className="text-xs font-bold uppercase tracking-widest text-white/50">Now Playing</div>
          <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          {!isLyricsMode ? (
            <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-[#ff9500]/20 mb-10 border border-white/10 transition-all">
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full max-w-sm aspect-square rounded-2xl overflow-y-auto mb-10 border border-white/10 bg-black/40 backdrop-blur-3xl p-6 hide-scrollbar relative transition-all">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none z-10" />
              {track.lyrics ? (
                <div className="text-2xl font-bold text-white/90 leading-relaxed tracking-wide pb-16 whitespace-pre-wrap">
                  {track.lyrics}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/40 text-center px-4">
                  <AlignLeft size={48} className="mb-4 opacity-50" />
                  <p className="font-bold text-lg mb-2">No lyrics provided.</p>
                  <p className="text-xs opacity-50 font-normal">Lyrics were not added when this track was uploaded.</p>
                </div>
              )}
            </div>
          )}
          
          <div className="w-full max-w-sm px-4">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white truncate max-w-[240px]">{track.title}</h2>
                <p className="text-lg text-[#ff9500] truncate max-w-[240px]">{track.artist}</p>
              </div>
              <button onClick={toggleLike} className={`p-2 transition-transform active:scale-90 ${isLiked ? 'text-[#ff9500]' : 'text-white/50 hover:text-white'}`}>
                <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="mb-8">
              <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer" onClick={seek}>
                <div className="h-full bg-gradient-to-r from-[#ff9500] to-[#ff3b30]" style={{ width: `${(progress / duration) * 100}%` }}></div>
              </div>
              <div className="flex justify-between text-xs text-white/50 mt-2 font-mono">
                <span>{formatTime(progress)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center px-4">
              <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="p-4 text-white hover:text-[#ff9500] transition-colors active:scale-95"><SkipBack size={36} fill="currentColor" /></button>
              <button onClick={togglePlay} className="w-20 h-20 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-white/10">
                {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-2" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="p-4 text-white hover:text-[#ff9500] transition-colors active:scale-95"><SkipForward size={36} fill="currentColor" /></button>
            </div>
            
            {/* Secondary Controls (Lyrics) */}
            <div className="flex justify-between items-center px-6 mt-6">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsLyricsMode(!isLyricsMode); }} 
                className={`p-3 rounded-xl transition-all active:scale-95 ${isLyricsMode ? 'bg-white/20 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
              >
                <AlignLeft size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mini Player
  return (
    <div 
      onClick={() => setIsExpanded(true)}
      className="fixed bottom-[max(80px,env(safe-area-inset-bottom)+80px)] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[496px] bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center gap-3 cursor-pointer hover:bg-[#2c2c2e]/90 transition-colors shadow-lg z-40"
    >
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={onNext} />
      
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
        <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate">{track.title}</div>
        <div className="text-xs text-[#ff9500] truncate">{track.artist}</div>
      </div>
      
      <div className="flex items-center gap-2 pr-2">
        <button onClick={togglePlay} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:text-white transition-colors">
          <SkipForward size={24} fill="currentColor" />
        </button>
      </div>
      
      <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#ff9500]" style={{ width: `${(progress / duration) * 100}%` }}></div>
      </div>
    </div>
  );
}
