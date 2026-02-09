'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MusicTrack } from '@/types';

export function useMusicTracks() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);

  const loadTracks = useCallback(async () => {
    try {
      const res = await fetch('/api/music-tracks');
      const data = await res.json();
      setTracks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load music tracks:', e);
    }
  }, []);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const uploadTrack = useCallback(async (file: File, name?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    const res = await fetch('/api/music-tracks', { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Failed to upload track');
    await loadTracks();
  }, [loadTracks]);

  const refresh = useCallback(() => loadTracks(), [loadTracks]);

  return { tracks, refresh, uploadTrack };
}
