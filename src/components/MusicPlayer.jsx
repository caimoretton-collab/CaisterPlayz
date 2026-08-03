import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, Heart, MessageCircle, AlignLeft, Wand2, CheckCircle2 } from 'lucide-react';
import pb from '../pocketbase';

export default function MusicPlayer({ track, onNext, onPrev, currentUserId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
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
        // Only count the play if the listener is NOT the uploader of the track
        if (track.userId !== currentUserId) {
          pb.collection('cplayz_tracks').update(track.id, { plays: (track.plays || 0) + 1 }).catch(() => {});
        }
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
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => setIsPlaying(true)).catch(e => {
          console.error("Playback blocked by browser:", e);
          setIsPlaying(false);
        });
      } else {
        setIsPlaying(true);
      }
    }
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

  return (
    <>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={onNext} />
      
      {isExpanded ? (
        <div 
          className="fixed inset-0 z-50 flex flex-col p-6 pb-12 animate-in slide-in-from-bottom-full duration-300 bg-cover bg-center overflow-hidden"
          style={{ backgroundImage: `url(${coverUrl})` }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[80px]" />
          
          <div className="relative z-10 w-full flex justify-center pt-2 pb-6 cursor-pointer" onClick={() => setIsExpanded(false)}>
            <div className="w-12 h-1.5 bg-white/30 rounded-full"></div>
          </div>

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 w-full max-w-md mx-auto">
            <div className={`w-full aspect-square rounded-xl overflow-hidden shadow-2xl shadow-black/50 mb-10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0 ${isPlaying ? 'scale-100' : 'scale-[0.85]'}`}>
              <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            </div>
            
            <div className="w-full shrink-0">
              <div className="flex justify-between items-center mb-6 px-4">
                <div className="min-w-0 pr-4">
                  <h2 className="text-2xl font-bold text-white truncate drop-shadow-md">{track.title}</h2>
                  <p className="text-lg text-white/70 font-medium truncate mt-0.5 drop-shadow-sm">{track.artist}</p>
                </div>
                <button onClick={toggleLike} className={`p-2 rounded-full bg-white/10 backdrop-blur-md transition-transform active:scale-90 shrink-0 ${isLiked ? 'text-[#ff3b30]' : 'text-white hover:bg-white/20'}`}>
                  <Heart size={24} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
                </button>
              </div>

              <div className="mb-8">
                <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer" onClick={seek}>
                  <div className="h-full bg-white rounded-full transition-all duration-100 ease-linear" style={{ width: `${(progress / duration) * 100}%` }}></div>
                </div>
                <div className="flex justify-between text-xs text-white/60 mt-2 font-medium">
                  <span>{formatTime(progress)}</span>
                  <span className="font-bold uppercase tracking-widest text-[9px] opacity-40">CP</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex justify-center items-center gap-10 mb-8">
                <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="text-white hover:text-white/80 transition-colors active:scale-90"><SkipBack size={40} fill="currentColor" /></button>
                <button onClick={togglePlay} className="w-[84px] h-[84px] flex items-center justify-center rounded-full bg-transparent hover:bg-white/10 active:bg-white/20 transition-colors">
                  {isPlaying ? <Pause size={52} fill="currentColor" /> : <Play size={52} fill="currentColor" className="ml-2" />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="text-white hover:text-white/80 transition-colors active:scale-90"><SkipForward size={40} fill="currentColor" /></button>
              </div>
              
              {/* Secondary Controls (Volume & Footer Icons) */}
              <div className="w-full">
                <div className="flex items-center gap-3 px-4 mb-6 opacity-60">
                  <span className="text-[10px]">🔈</span>
                  <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                     <div className="h-full bg-white rounded-full w-[75%]"></div>
                  </div>
                  <span className="text-[12px]">🔊</span>
                </div>
                
                <div className="flex justify-between items-center px-8 border-t border-white/10 pt-6">
                  <button className="p-2 transition-all active:scale-90 text-white/50 hover:text-white">
                     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 0-7.07 17.07l.71-.7a9 9 0 0 1 12.72 0l.7-.7A10 10 0 0 0 12 2z"></path><path d="M12 6a6 6 0 0 0-4.24 10.24l.71-.7a5 5 0 0 1 7.06 0l.71-.7A6 6 0 0 0 12 6z"></path><path d="M12 10a2 2 0 0 0-1.41 3.41l.7.71a1 1 0 0 1 1.42 0l.7-.71A2 2 0 0 0 12 10z"></path><polygon points="12 22 17 14 7 14 12 22"></polygon></svg>
                  </button>
                  
                  <button className="p-2 transition-all active:scale-90 text-white/50 hover:text-white">
                     <AlignLeft size={22} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-[max(80px,env(safe-area-inset-bottom)+80px)] left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[496px] bg-[#1c1c1e]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center gap-3 cursor-pointer hover:bg-[#2c2c2e]/90 transition-colors shadow-lg z-40"
        >
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
      )}
    </>
  );
}
