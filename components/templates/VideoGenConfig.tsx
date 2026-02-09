'use client';

import { useEffect, useState, useRef } from 'react';
import { useModels } from '@/hooks/useModels';
import { X } from 'lucide-react';
import type { VideoGenConfig as VGC, ModelImage } from '@/types';

type ImageSource = 'model' | 'upload';

export default function VideoGenConfig({
  config, onChange,
}: {
  config: VGC;
  onChange: (c: VGC) => void;
}) {
  const { models, modelImages, loadModelImages } = useModels();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageSource, setImageSource] = useState<ImageSource>(
    () => (config.imageUrl && !config.imageId) ? 'upload' : 'model'
  );

  useEffect(() => {
    if (config.modelId) loadModelImages(config.modelId);
  }, [config.modelId, loadModelImages]);

  const handleImageSourceChange = (src: ImageSource) => {
    setImageSource(src);
    if (src === 'upload') {
      onChange({ ...config, modelId: undefined, imageId: undefined });
    } else {
      onChange({ ...config, imageUrl: undefined });
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        onChange({ ...config, imageUrl: data.url || data.path, modelId: undefined, imageId: undefined });
      }
    } catch {
      // handled silently
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('!border-gray-400', '!bg-gray-50');
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const isMotion = config.mode === 'motion-control';
  const minDuration = isMotion ? 5 : 2;
  const maxDuration = isMotion ? 30 : 10;
  const defaultDuration = isMotion ? 10 : 5;

  return (
    <div className="space-y-5">
      {/* Mode */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Mode</label>
        <div className="flex gap-2">
          {(['motion-control', 'subtle-animation'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChange({ ...config, mode })}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                config.mode === mode
                  ? 'bg-gray-900 text-white'
                  : 'border border-[var(--border)] text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {mode === 'motion-control' ? 'Motion Control' : 'Subtle Animation'}
            </button>
          ))}
        </div>
      </div>

      {/* Image Source Toggle */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Image Source</label>
        <div className="flex gap-2">
          {([
            { key: 'model' as ImageSource, label: 'From Model' },
            { key: 'upload' as ImageSource, label: 'Upload Image' },
          ]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleImageSourceChange(opt.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150 ${
                imageSource === opt.key
                  ? 'bg-gray-900 text-white'
                  : 'border border-[var(--border)] text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Model + Image Picker */}
      {imageSource === 'model' && (
        <>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500">Model</label>
            <select
              value={config.modelId || ''}
              onChange={(e) => onChange({ ...config, modelId: e.target.value, imageId: undefined, imageUrl: undefined })}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text)] focus:border-gray-400 focus:outline-none"
            >
              <option value="">Select a model…</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {config.modelId && modelImages.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Image</label>
              <div className="grid grid-cols-4 gap-1.5">
                {modelImages.map((img: ModelImage) => (
                  <button
                    key={img.id}
                    onClick={() => onChange({ ...config, imageId: img.id, imageUrl: undefined })}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all duration-150 ${
                      config.imageId === img.id
                        ? 'border-gray-900 shadow-md'
                        : 'border-[var(--border)] hover:border-gray-300'
                    }`}
                  >
                    <img src={img.signedUrl || img.gcsUrl} alt={img.filename} className="h-full w-full object-cover" />
                    {config.imageId === img.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="h-4 w-4 rounded-full border-2 border-white bg-gray-900" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Direct Image Upload */}
      {imageSource === 'upload' && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500">Model Image</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

          {config.imageUrl ? (
            <div className="relative">
              <img
                src={config.imageUrl}
                alt="Uploaded"
                className="max-h-36 w-full rounded-xl border border-[var(--border)] object-contain bg-[var(--background)] p-1"
              />
              <button
                onClick={() => onChange({ ...config, imageUrl: undefined })}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white transition-colors hover:bg-black/70"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-colors ${
                isUploadingImage
                  ? 'border-gray-400 bg-gray-50'
                  : 'border-gray-300 bg-[var(--background)] hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('!border-gray-400', '!bg-gray-50');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('!border-gray-400', '!bg-gray-50');
              }}
              onDrop={handleDrop}
            >
              {isUploadingImage ? (
                <>
                  <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin" />
                  <span className="mt-2 text-xs font-medium text-gray-500">Uploading…</span>
                </>
              ) : (
                <>
                  <span className="text-2xl text-gray-400">+</span>
                  <span className="mt-1 text-xs text-gray-400">Click or drag image here</span>
                </>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploadingImage} />
            </label>
          )}
        </div>
      )}

      {/* Prompt */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500">Prompt</label>
        <textarea
          value={config.prompt || ''}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          placeholder="Describe the motion…"
          rows={2}
          className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
        />
      </div>

      {/* Duration — shown for both modes */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-medium text-gray-500">Max Duration</label>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] tabular-nums font-medium text-gray-600">
            {config.maxSeconds || defaultDuration}s
          </span>
        </div>
        <input
          type="range"
          min={minDuration}
          max={maxDuration}
          value={config.maxSeconds || defaultDuration}
          onChange={(e) => onChange({ ...config, maxSeconds: parseInt(e.target.value) })}
          className="w-full" style={{ accentColor: '#111827' }}
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
          <span>{minDuration}s</span><span>{maxDuration}s</span>
        </div>
      </div>
    </div>
  );
}
