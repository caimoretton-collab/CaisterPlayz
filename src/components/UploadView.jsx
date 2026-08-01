import React, { useState } from 'react';
import pb from '../pocketbase';
import { Upload, Music, Image as ImageIcon } from 'lucide-react';

export default function UploadView({ currentUserId, onUploadSuccess }) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !artist || !audioFile) {
      alert("Title, Artist, and Audio File are required.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('artist', artist);
      formData.append('audioFile', audioFile);
      if (coverFile) {
        formData.append('coverArt', coverFile);
      }
      formData.append('userId', currentUserId);
      formData.append('plays', 0);
      formData.append('likes', 0);

      await pb.collection('cplayz_tracks').create(formData);
      alert('Track uploaded successfully!');
      setTitle('');
      setArtist('');
      setAudioFile(null);
      setCoverFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to upload track: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pb-32 pt-4 px-4">
      <h1 className="text-3xl font-bold mb-6 text-white font-['Anton'] tracking-wider">DROP TRACK</h1>
      
      <form onSubmit={handleUpload} className="bg-[#1c1c1e] p-5 rounded-2xl border border-white/10 space-y-5">
        <div>
          <label className="block text-xs font-bold text-white/50 mb-1 uppercase tracking-wider">Track Title</label>
          <input 
            type="text" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-[#0c0c0c] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#ff9500] transition-colors"
            placeholder="e.g. Midnight Drive"
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-white/50 mb-1 uppercase tracking-wider">Artist Name</label>
          <input 
            type="text" 
            value={artist}
            onChange={e => setArtist(e.target.value)}
            className="w-full bg-[#0c0c0c] border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#ff9500] transition-colors"
            placeholder="Your stage name"
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-white/50 mb-1 uppercase tracking-wider">Audio File (MP3/WAV)</label>
          <label className="w-full flex items-center justify-center gap-3 bg-[#0c0c0c] border border-white/10 border-dashed rounded-xl px-4 py-8 text-white/70 cursor-pointer hover:bg-white/5 transition-colors">
            <Music size={24} />
            <span>{audioFile ? audioFile.name : 'Tap to select audio file'}</span>
            <input 
              type="file" 
              accept="audio/*" 
              className="hidden"
              onChange={e => setAudioFile(e.target.files[0])}
              disabled={uploading}
            />
          </label>
        </div>

        <div>
          <label className="block text-xs font-bold text-white/50 mb-1 uppercase tracking-wider">Cover Art (Optional)</label>
          <label className="w-full flex items-center justify-center gap-3 bg-[#0c0c0c] border border-white/10 border-dashed rounded-xl px-4 py-8 text-white/70 cursor-pointer hover:bg-white/5 transition-colors">
            <ImageIcon size={24} />
            <span>{coverFile ? coverFile.name : 'Tap to select cover image'}</span>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden"
              onChange={e => setCoverFile(e.target.files[0])}
              disabled={uploading}
            />
          </label>
        </div>

        <button 
          type="submit" 
          disabled={uploading}
          className="w-full bg-gradient-to-r from-[#ff9500] to-[#ff3b30] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-sm hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {uploading ? 'UPLOADING...' : <><Upload size={18} /> UPLOAD TRACK</>}
        </button>
      </form>
    </div>
  );
}
