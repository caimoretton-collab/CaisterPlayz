import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Minimize2, Heart, MessageCircle, AlignLeft, Wand2, CheckCircle2 } from 'lucide-react';
import pb from '../pocketbase';

export default function MusicPlayer({ track, onNext, onPrev, currentUserId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLyricsMode, setIsLyricsMode] = useState(false);
  const audioRef = useRef(null);
  const lyricsContainerRef = useRef(null);
  const [hasLoggedPlay, setHasLoggedPlay] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState(null);
  const [activeLineIdx, setActiveLineIdx] = useState(-1);
  
  // Sync Studio State
  const [isSyncStudioMode, setIsSyncStudioMode] = useState(false);
  const [syncLines, setSyncLines] = useState([]);
  const [currentSyncIdx, setCurrentSyncIdx] = useState(0);
  const [syncedTimestamps, setSyncedTimestamps] = useState([]);
  const [savingSync, setSavingSync] = useState(false);
  
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



  const parseLrcText = (lrcString) => {
    if (!lrcString) return null;
    const lrcRegex = /\[\d{2}:\d{2}\.\d{2,3}\]/;
    if (lrcRegex.test(lrcString)) {
      const lines = lrcString.split('\n');
      const parsed = [];
      lines.forEach(line => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const milliseconds = parseInt(match[3], 10);
          const time = minutes * 60 + seconds + (milliseconds / (match[3].length === 3 ? 1000 : 100));
          const text = match[4].trim();
          if (text) {
            parsed.push({ time, text });
          }
        }
      });
      return parsed.length > 0 ? parsed : null;
    }
    return null;
  };

  useEffect(() => {
    let active = true;
    
    const loadLyrics = async () => {
      if (!track) {
        setParsedLyrics(null);
        return;
      }
      
      if (track.lyrics) {
        setParsedLyrics(parseLrcText(track.lyrics));
        return;
      }
      
      // If no lyrics, attempt to auto-fetch from LRCLIB
      try {
        const query = new URLSearchParams({ track_name: track.title, artist_name: track.artist });
        const res = await fetch(`https://lrclib.net/api/get?${query}`);
        if (!res.ok) throw new Error('Not found');
        
        const data = await res.json();
        if (data.syncedLyrics && active) {
          setParsedLyrics(parseLrcText(data.syncedLyrics));
          
          // Optionally save it back to the database if we own the track
          if (track.userId === currentUserId) {
            try {
              await pb.collection('cplayz_tracks').update(track.id, { lyrics: data.syncedLyrics });
              track.lyrics = data.syncedLyrics; // Update local reference
            } catch (e) {
              console.error("Failed to save auto-fetched lyrics", e);
            }
          }
        } else {
          if (active) setParsedLyrics(null);
        }
      } catch (e) {
        console.log("No auto-lyrics found for this track on LRCLIB.");
        if (active) setParsedLyrics(null);
      }
    };

    loadLyrics();
    
    return () => { active = false; };
  }, [track, currentUserId]);

  useEffect(() => {
    if (parsedLyrics) {
      let currentIdx = -1;
      for (let i = 0; i < parsedLyrics.length; i++) {
        if (progress >= parsedLyrics[i].time) {
          currentIdx = i;
        } else {
          break;
        }
      }
      setActiveLineIdx(currentIdx);
    }
  }, [progress, parsedLyrics]);

  useEffect(() => {
    if (isLyricsMode && activeLineIdx >= 0 && lyricsContainerRef.current) {
      const activeElement = lyricsContainerRef.current.querySelector(`[data-idx="${activeLineIdx}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeLineIdx, isLyricsMode]);

  const startSyncStudio = (e) => {
    e.stopPropagation();
    if (!track.lyrics) return;
    
    // Strip any existing timestamps to get pure text
    const cleanLines = track.lyrics.split('\n').map(line => line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim()).filter(line => line);
    setSyncLines(cleanLines);
    setCurrentSyncIdx(0);
    setSyncedTimestamps([]);
    setIsSyncStudioMode(true);
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSyncTap = (e) => {
    e.stopPropagation();
    if (audioRef.current && currentSyncIdx < syncLines.length) {
      const time = audioRef.current.currentTime;
      setSyncedTimestamps(prev => [...prev, time]);
      
      const nextIdx = currentSyncIdx + 1;
      setCurrentSyncIdx(nextIdx);
      
      if (nextIdx >= syncLines.length) {
        finishSyncStudio([...syncedTimestamps, time]);
      }
    }
  };

  const formatLrcTime = (timeSeconds) => {
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = Math.floor(timeSeconds % 60);
    const milliseconds = Math.floor((timeSeconds % 1) * 100);
    return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}]`;
  };

  const finishSyncStudio = async (finalTimestamps) => {
    setSavingSync(true);
    try {
      const lrcLines = syncLines.map((line, i) => {
        const t = finalTimestamps[i];
        return `${formatLrcTime(t)} ${line}`;
      });
      const newLyrics = lrcLines.join('\n');
      
      await pb.collection('cplayz_tracks').update(track.id, { lyrics: newLyrics });
      track.lyrics = newLyrics; // update local instantly
      
      // Instantly apply the parsed version so it works without reloading
      const parsed = syncLines.map((text, i) => ({ time: finalTimestamps[i], text }));
      setParsedLyrics(parsed);
      
      alert('Lyrics synced successfully!');
      setIsSyncStudioMode(false);
    } catch (e) {
      console.error('Error saving synced lyrics', e);
      alert('Failed to save synced lyrics.');
    } finally {
      setSavingSync(false);
    }
  };

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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[60px]" />
          
          <div className="relative z-10 flex justify-between items-center mb-6 pt-4">
            <button onClick={() => { setIsExpanded(false); setIsSyncStudioMode(false); }} className="p-2 text-white/70 hover:text-white">
              <Minimize2 size={24} />
            </button>
            <div className="text-xs font-bold uppercase tracking-widest text-white/50">
              {isSyncStudioMode ? 'Sync Studio' : 'Now Playing'}
            </div>
            <div className="w-10"></div>
          </div>

          <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 w-full max-w-md mx-auto">
            {!isLyricsMode && !isSyncStudioMode ? (
              <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-black/50 mb-10 border border-white/10 transition-all shrink-0">
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
              </div>
            ) : isSyncStudioMode ? (
              <div className="w-full flex-1 mb-10 border border-[#ff9500]/30 bg-black/40 backdrop-blur-3xl p-6 rounded-2xl relative flex flex-col items-center shadow-[0_0_50px_rgba(255,149,0,0.2)]">
                <div className="w-full flex-1 overflow-y-auto hide-scrollbar pb-[40vh] pt-[20vh] mask-image-fade" ref={lyricsContainerRef} style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
                  {syncLines.map((line, idx) => {
                    const isCurrent = idx === currentSyncIdx;
                    const isDone = idx < currentSyncIdx;
                    
                    if (isCurrent && lyricsContainerRef.current) {
                      const el = lyricsContainerRef.current.querySelector(`[data-sync-idx="${idx}"]`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    
                    return (
                      <p 
                        key={idx} 
                        data-sync-idx={idx}
                        className={`text-[28px] font-black leading-tight tracking-tight mb-8 transition-all duration-300 text-center ${
                          isCurrent ? 'text-[#ff9500] scale-105 opacity-100' : isDone ? 'text-white/30 blur-[1px]' : 'text-white/60 blur-[1px]'
                        }`}
                      >
                        {line}
                      </p>
                    );
                  })}
                </div>
                
                <div className="w-full mt-4 pb-4">
                  <button 
                    onClick={handleSyncTap}
                    disabled={savingSync}
                    className="w-full py-6 rounded-2xl bg-[#ff9500] text-black font-black text-xl tracking-widest uppercase active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(255,149,0,0.4)]"
                  >
                    {savingSync ? 'Saving...' : 'Tap to Sync Line'} <CheckCircle2 />
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex-1 overflow-y-auto mb-10 hide-scrollbar relative transition-all mask-image-fade" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}>
                {parsedLyrics ? (
                  <div className="w-full pb-[60vh] pt-[30vh]" ref={lyricsContainerRef}>
                    {parsedLyrics.map((line, idx) => {
                      const isActive = idx === activeLineIdx;
                      return (
                        <p 
                          key={idx} 
                          data-idx={idx}
                          className={`text-[28px] font-black leading-tight tracking-tight mb-8 transition-all duration-700 ease-out cursor-pointer ${
                            isActive 
                              ? 'text-white scale-100 origin-left blur-none opacity-100' 
                              : 'text-white scale-95 origin-left blur-[2px] opacity-40 hover:opacity-70 hover:blur-none'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (audioRef.current) {
                              audioRef.current.currentTime = line.time;
                              setProgress(line.time);
                            }
                          }}
                        >
                          {line.text}
                        </p>
                      );
                    })}
                  </div>
                ) : track.lyrics ? (
                  <div className="w-full pb-[20vh] pt-[10vh]">
                    {track.lyrics.split('\n').map((line, idx) => (
                      <p 
                        key={idx} 
                        className="text-[28px] font-black text-white/90 leading-tight tracking-tight mb-8 animate-in slide-in-from-bottom-8 fade-in duration-1000 fill-mode-both"
                        style={{ animationDelay: `${Math.min(idx * 50, 1500)}ms` }}
                      >
                        {line || '\u00A0'}
                      </p>
                    ))}
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
            
            <div className="w-full shrink-0">
              <div className="flex justify-between items-end mb-6 px-4">
                <div className="min-w-0 pr-4">
                  <h2 className="text-[22px] font-black text-white truncate">{track.title}</h2>
                  <p className="text-[17px] text-white/70 font-medium truncate mt-1">{track.artist}</p>
                </div>
                <button onClick={toggleLike} className={`p-2 transition-transform active:scale-90 shrink-0 ${isLiked ? 'text-[#ff9500]' : 'text-white hover:text-[#ff9500]'}`}>
                  <Heart size={28} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2} />
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
              
              {/* Secondary Controls (Lyrics & Studio) */}
              <div className="flex justify-between items-center px-6 mt-6">
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsLyricsMode(!isLyricsMode); setIsSyncStudioMode(false); }} 
                  className={`p-3 rounded-xl transition-all active:scale-95 ${isLyricsMode ? 'bg-white/20 text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                  <AlignLeft size={24} />
                </button>
                
                {isLyricsMode && track.lyrics && track.userId === currentUserId && !isSyncStudioMode && (
                  <button 
                    onClick={startSyncStudio}
                    className="p-3 rounded-xl text-[#ff9500] hover:bg-[#ff9500]/20 transition-all active:scale-95 flex items-center gap-2 text-sm font-bold tracking-wider uppercase"
                  >
                    <Wand2 size={20} /> Sync
                  </button>
                )}
                
                {isSyncStudioMode && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsSyncStudioMode(false); }}
                    className="p-3 rounded-xl text-red-500 hover:bg-red-500/20 transition-all active:scale-95 text-sm font-bold uppercase"
                  >
                    Cancel
                  </button>
                )}
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
