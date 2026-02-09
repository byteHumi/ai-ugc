'use client';

import { useState, useRef } from 'react';
import { Save, BookOpen, Trash2 } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { usePresets } from '@/hooks/usePresets';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { useToast } from '@/hooks/useToast';
import PipelineBuilder from '@/components/templates/PipelineBuilder';
import NodeConfigPanel from '@/components/templates/NodeConfigPanel';
import TemplateJobList from '@/components/templates/TemplateJobList';
import RefreshButton from '@/components/ui/RefreshButton';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import type { MiniAppStep } from '@/types';

export default function TemplatesPage() {
  const { jobs, refresh } = useTemplates();
  const { presets, savePreset, deletePreset } = usePresets();
  const { uploadVideo, isUploading, progress } = useVideoUpload();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Pipeline state
  const [steps, setSteps] = useState<MiniAppStep[]>([]);
  const [name, setName] = useState('');
  const [videoSource, setVideoSource] = useState<'tiktok' | 'upload'>('tiktok');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadedFilename, setUploadedFilename] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadVideo(file);
      if (result) {
        setVideoUrl(result.gcsUrl);
        setUploadedFilename(file.name);
      }
    } catch {
      showToast('Failed to upload video', 'error');
    }
  };

  const handleUpdateStep = (id: string, updated: MiniAppStep) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const handleRemoveStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  const handleLoadPreset = (pipeline: MiniAppStep[]) => {
    // Generate new IDs so each load is independent
    const newSteps = pipeline.map((s) => ({
      ...s,
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    }));
    setSteps(newSteps);
    setShowPresets(false);
    setSelectedNodeId(null);
    showToast('Preset loaded!', 'success');
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      showToast('Enter a preset name', 'error');
      return;
    }
    if (steps.length === 0) {
      showToast('Add pipeline steps first', 'error');
      return;
    }
    try {
      await savePreset(presetName.trim(), steps);
      setShowSavePreset(false);
      setPresetName('');
      showToast('Preset saved!', 'success');
    } catch {
      showToast('Failed to save preset', 'error');
    }
  };

  const handleRun = async () => {
    const enabledSteps = steps.filter((s) => s.enabled);
    if (enabledSteps.length === 0) {
      showToast('Add at least one pipeline step', 'error');
      return;
    }

    const firstStep = enabledSteps[0];
    const needsInputVideo = firstStep.type !== 'video-generation';

    if (needsInputVideo) {
      if (videoSource === 'tiktok' && !tiktokUrl) {
        showToast('Enter a TikTok URL', 'error');
        setSelectedNodeId('source');
        return;
      }
      if (videoSource === 'upload' && !videoUrl) {
        showToast('Upload a video first', 'error');
        setSelectedNodeId('source');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || `Template ${new Date().toLocaleTimeString()}`,
          pipeline: steps,
          videoSource,
          tiktokUrl: videoSource === 'tiktok' ? tiktokUrl : undefined,
          videoUrl: videoSource === 'upload' ? videoUrl : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create template job');
      }

      showToast('Pipeline started!', 'success');
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to start pipeline', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="-m-8">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-lg font-bold">Templates</h1>
            <p className="text-xs text-[var(--text-muted)]">Build multi-step video pipelines</p>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Pipeline name..."
            className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Presets */}
          <button
            onClick={() => setShowPresets(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--background)]"
          >
            <BookOpen className="h-3.5 w-3.5" /> Presets
          </button>
          <button
            onClick={() => setShowSavePreset(true)}
            disabled={steps.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--background)] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Save
          </button>

          {/* Run */}
          <button
            onClick={handleRun}
            disabled={isSubmitting || steps.filter((s) => s.enabled).length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? <><Spinner className="h-3.5 w-3.5" /> Running...</> : 'Run Pipeline'}
          </button>

          <RefreshButton onClick={refresh} />
        </div>
      </div>

      {/* Main area: Canvas + Config Panel */}
      <div className="flex" style={{ height: 'calc(100vh - 7.5rem)' }}>
        {/* Left: Flow canvas + jobs */}
        <div className="flex-1 overflow-y-auto p-6">
          <PipelineBuilder
            steps={steps}
            onChange={setSteps}
            selectedId={selectedNodeId}
            onSelect={setSelectedNodeId}
            videoSource={videoSource}
            tiktokUrl={tiktokUrl}
            videoUrl={videoUrl}
          />

          {/* Recent Jobs */}
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold">Recent Jobs</h2>
            <TemplateJobList jobs={jobs} />
          </div>
        </div>

        {/* Right: Config Panel */}
        <div className="w-[380px] shrink-0 overflow-y-auto">
          <input ref={fileRef} type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
          <NodeConfigPanel
            selectedId={selectedNodeId}
            steps={steps}
            onUpdateStep={handleUpdateStep}
            onRemoveStep={handleRemoveStep}
            onClose={() => setSelectedNodeId(null)}
            sourceConfig={{
              videoSource,
              tiktokUrl,
              videoUrl,
              uploadedFilename,
              isUploading,
              uploadProgress: progress,
              onVideoSourceChange: setVideoSource,
              onTiktokUrlChange: setTiktokUrl,
              onVideoUpload: (e) => handleVideoUpload(e),
              onVideoRemove: () => { setVideoUrl(''); setUploadedFilename(''); },
            }}
            videoUrl={videoSource === 'upload' ? videoUrl : undefined}
          />
        </div>
      </div>

      {/* Presets Modal */}
      <Modal open={showPresets} onClose={() => setShowPresets(false)} title="Pipeline Presets">
        <div className="p-4">
          {presets.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-muted)]">
              No saved presets yet. Build a pipeline and click "Save" to create one.
            </div>
          ) : (
            <div className="space-y-2">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--background)]"
                >
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleLoadPreset(preset.pipeline)}>
                    <div className="text-sm font-medium">{preset.name}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {preset.pipeline.length} step{preset.pipeline.length !== 1 ? 's' : ''}
                      {preset.description && ` — ${preset.description}`}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {preset.pipeline.map((s, i) => (
                        <span key={i} className="rounded bg-[var(--background)] px-1.5 py-0.5 text-[9px] capitalize text-[var(--text-muted)]">
                          {s.type.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => deletePreset(preset.id)}
                    className="shrink-0 text-[var(--text-muted)] hover:text-[var(--error)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Save Preset Modal */}
      <Modal open={showSavePreset} onClose={() => setShowSavePreset(false)} title="Save as Preset">
        <div className="p-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Preset Name</label>
            <input
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="My UGC Pipeline"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
            />
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            This will save the current {steps.length} step{steps.length !== 1 ? 's' : ''} as a reusable preset.
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowSavePreset(false)} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">Cancel</button>
            <button onClick={handleSavePreset} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white">Save Preset</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
