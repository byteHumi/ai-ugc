'use client';

import { useRef } from 'react';
import { Upload, Music } from 'lucide-react';
import { useMusicTracks } from '@/hooks/useMusicTracks';
import type { BgMusicConfig as BMC } from '@/types';

export default function BgMusicConfig({
  config, onChange,
}: {
  config: BMC;
  onChange: (c: BMC) => void;
}) {
  const { tracks, uploadTrack } = useMusicTracks();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadTrack(file, file.name.replace(/\.\w+$/, ''));
    } catch (err) {
      console.error('Upload track error:', err);
    }
  };

  return (
    <div className="space-y-5">
      {/* Track */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Track</label>
        {tracks.length > 0 ? (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {tracks.map((t) => (
              <button
                key={t.id}
                onClick={() => onChange({ ...config, trackId: t.id, customTrackUrl: t.gcsUrl })}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                  config.trackId === t.id
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-[var(--border)] hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  <Music className="h-3.5 w-3.5 text-gray-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-[var(--text)]">
                    {t.name} {t.isDefault && <span className="text-gray-400">Default</span>}
                  </div>
                  {t.duration && (
                    <div className="text-[10px] tabular-nums text-gray-400">{Math.round(t.duration)}s</div>
                  )}
                </div>
                {config.trackId === t.id && (
                  <div className="h-2 w-2 rounded-full bg-gray-900" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No tracks available. Upload one below.</p>
        )}
      </div>

      {/* Upload */}
      <div>
        <input ref={fileRef} type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-400 transition-colors hover:border-gray-400 hover:text-gray-600"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Custom Track
        </button>
      </div>

      {/* Volume */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">Volume</label>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] tabular-nums font-medium text-gray-600">
            {config.volume}%
          </span>
        </div>
        <input
          type="range" min={0} max={100}
          value={config.volume}
          onChange={(e) => onChange({ ...config, volume: parseInt(e.target.value) })}
          className="w-full" style={{ accentColor: '#111827' }}
        />
      </div>

      {/* Fade */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Fade</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-gray-400">In (s)</label>
            <input
              type="number" min={0} step={0.5}
              value={config.fadeIn ?? ''}
              onChange={(e) => onChange({ ...config, fadeIn: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="0"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums text-[var(--text)] placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] text-gray-400">Out (s)</label>
            <input
              type="number" min={0} step={0.5}
              value={config.fadeOut ?? ''}
              onChange={(e) => onChange({ ...config, fadeOut: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="0"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums text-[var(--text)] placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
