'use client';

import { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical, Plus, Video, Type, Music, Film, Upload, Play,
  ChevronRight, Eye, EyeOff, Trash2,
} from 'lucide-react';
import type {
  MiniAppStep, MiniAppType,
  VideoGenConfig, TextOverlayConfig, BgMusicConfig, AttachVideoConfig,
} from '@/types';
import MiniAppPicker from './MiniAppPicker';
import Modal from '@/components/ui/Modal';

const nodeMeta: Record<MiniAppType, {
  label: string;
  icon: typeof Video;
  iconBg: string;
  iconColor: string;
}> = {
  'video-generation': { label: 'Video Generation', icon: Video,  iconBg: '#f3f0ff', iconColor: '#7c3aed' },
  'text-overlay':     { label: 'Text Overlay',     icon: Type,   iconBg: '#eff6ff', iconColor: '#2563eb' },
  'bg-music':         { label: 'Background Music', icon: Music,  iconBg: '#ecfdf5', iconColor: '#059669' },
  'attach-video':     { label: 'Attach Video',     icon: Film,   iconBg: '#fff7ed', iconColor: '#ea580c' },
};

function getStepSummary(step: MiniAppStep): string {
  if (!step.enabled) return 'Disabled';
  switch (step.type) {
    case 'video-generation': {
      const c = step.config as VideoGenConfig;
      return c.mode === 'motion-control' ? 'Motion Control' : 'Subtle Animation';
    }
    case 'text-overlay': {
      const c = step.config as TextOverlayConfig;
      if (!c.text) return 'Configure text\u2026';
      return `\u201c${c.text.slice(0, 22)}${c.text.length > 22 ? '\u2026' : ''}\u201d`;
    }
    case 'bg-music': {
      const c = step.config as BgMusicConfig;
      return `Volume ${c.volume}%${c.trackId ? '' : ' \u00b7 No track'}`;
    }
    case 'attach-video': {
      const c = step.config as AttachVideoConfig;
      const pos = c.position === 'before' ? 'Prepend' : 'Append';
      if (c.sourceStepId) return `${pos} · Pipeline`;
      if (c.tiktokUrl) return `${pos} · TikTok`;
      if (c.videoUrl) return `${pos} · Uploaded`;
      return `${pos} clip`;
    }
    default: return '';
  }
}

/* ── Connector ─────────────────────────────────────────────────── */
function FlowConnector() {
  return (
    <div className="flex justify-center">
      <svg width="12" height="28" viewBox="0 0 12 28" fill="none">
        <path d="M6 0V20" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M2.5 19 L6 26 L9.5 19" fill="#d1d5db" />
      </svg>
    </div>
  );
}

/* ── Sortable Node ─────────────────────────────────────────────── */
function SortableFlowNode({
  step, index, isSelected, onSelect, onToggle, onRemove, steps,
}: {
  step: MiniAppStep; index: number; isSelected: boolean;
  onSelect: () => void; onToggle: () => void; onRemove: () => void;
  steps: MiniAppStep[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const meta = nodeMeta[step.type];
  const Icon = meta.icon;
  const summary = getStepSummary(step);

  const isConfigured =
    step.type === 'text-overlay'     ? !!(step.config as TextOverlayConfig).text :
    step.type === 'bg-music'         ? !!(step.config as BgMusicConfig).trackId || !!(step.config as BgMusicConfig).customTrackUrl :
    step.type === 'attach-video'     ? !!(step.config as AttachVideoConfig).videoUrl || !!(step.config as AttachVideoConfig).sourceStepId || !!(step.config as AttachVideoConfig).tiktokUrl :
    step.type === 'video-generation' ? !!(step.config as VideoGenConfig).imageId || !!(step.config as VideoGenConfig).imageUrl :
    false;

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center gap-2">
        {/* Left controls */}
        <div className="flex flex-col items-center gap-px shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`rounded-md p-1 transition-colors ${
              step.enabled ? 'text-gray-400 hover:text-gray-600' : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            {step.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="rounded-md p-1 text-gray-300 transition-colors hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Card */}
        <div
          onClick={onSelect}
          className={`group flex-1 cursor-pointer rounded-2xl border bg-[var(--surface)] transition-all duration-150 ${
            isDragging ? 'scale-[1.02] shadow-xl' : ''
          } ${isSelected
            ? 'border-gray-900 shadow-md'
            : 'border-[var(--border)] shadow-sm hover:border-gray-300 hover:shadow-md'
          } ${!step.enabled ? 'opacity-40' : ''}`}
          style={{ minWidth: 260, maxWidth: 320 }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab touch-none text-gray-300 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>

            {/* Icon */}
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: meta.iconBg }}
            >
              <Icon className="h-4 w-4" style={{ color: meta.iconColor }} />
            </div>

            {/* Text */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-[var(--text)]">{meta.label}</span>
                <span className="text-[11px] text-gray-400">#{index + 1}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="truncate text-[11px] text-gray-500">{summary}</span>
                {step.type === 'attach-video' && (step.config as AttachVideoConfig).sourceStepId && (() => {
                  const refIdx = steps.findIndex((s) => s.id === (step.config as AttachVideoConfig).sourceStepId);
                  if (refIdx === -1) return null;
                  return (
                    <span className="inline-flex shrink-0 items-center gap-0.5 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">
                      ← from #{refIdx + 1}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Status dot + chevron */}
            <div className="flex items-center gap-2 shrink-0">
              {step.enabled && (
                <div className={`h-2 w-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              )}
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      <FlowConnector />
    </div>
  );
}

/* ── Pipeline Builder ──────────────────────────────────────────── */
export default function PipelineBuilder({
  steps, onChange, selectedId, onSelect,
  videoSource, tiktokUrl, videoUrl,
}: {
  steps: MiniAppStep[];
  onChange: (steps: MiniAppStep[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  videoSource: 'tiktok' | 'upload';
  tiktokUrl: string;
  videoUrl: string;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(arrayMove(steps, steps.findIndex((s) => s.id === active.id), steps.findIndex((s) => s.id === over.id)));
  };

  const handleAdd = (step: MiniAppStep) => {
    onChange([...steps, step]);
    setShowPicker(false);
    onSelect(step.id);
  };

  const handleToggle = (id: string) => {
    onChange(steps.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleRemove = (id: string) => {
    onChange(steps.filter((s) => s.id !== id));
    if (selectedId === id) onSelect(null);
  };

  const sourceHasValue = videoSource === 'tiktok' ? !!tiktokUrl : !!videoUrl;
  const sourceSummary = videoSource === 'tiktok'
    ? (tiktokUrl ? tiktokUrl.slice(0, 28) + '\u2026' : 'Configure TikTok URL\u2026')
    : (videoUrl ? 'Video uploaded' : 'Upload a video\u2026');
  const enabledCount = steps.filter((s) => s.enabled).length;

  return (
    <div
      className="relative rounded-2xl border border-[var(--border)] bg-[var(--background)]"
      style={{
        backgroundImage: 'radial-gradient(circle, #e5e7eb 0.5px, transparent 0.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="flex flex-col items-center px-6 py-10">
        {/* Source Node */}
        <div
          onClick={() => onSelect('source')}
          className={`group cursor-pointer rounded-2xl border bg-[var(--surface)] transition-all duration-150 ${
            selectedId === 'source'
              ? 'border-gray-900 shadow-md'
              : 'border-[var(--border)] shadow-sm hover:border-gray-300 hover:shadow-md'
          }`}
          style={{ minWidth: 260, maxWidth: 320 }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Upload className="h-4 w-4 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--text)]">Video Source</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {videoSource}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[11px] text-gray-500">{sourceSummary}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className={`h-2 w-2 rounded-full ${sourceHasValue ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </div>
          </div>
        </div>

        <FlowConnector />

        {/* Pipeline Steps */}
        {steps.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {steps.map((step, i) => (
                <SortableFlowNode
                  key={step.id}
                  step={step}
                  index={i}
                  isSelected={selectedId === step.id}
                  onSelect={() => onSelect(step.id)}
                  onToggle={() => handleToggle(step.id)}
                  onRemove={() => handleRemove(step.id)}
                  steps={steps}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Add Step */}
        <button
          onClick={() => setShowPicker(true)}
          className="group flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-[var(--surface)]/80 px-5 py-2.5 transition-all duration-150 hover:border-gray-400 hover:shadow-sm"
          style={{ minWidth: 200, backdropFilter: 'blur(4px)' }}
        >
          <Plus className="h-4 w-4 text-gray-400 transition-colors group-hover:text-gray-600" />
          <span className="text-sm font-medium text-gray-400 transition-colors group-hover:text-gray-600">Add Step</span>
        </button>

        <FlowConnector />

        {/* Output Node */}
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm"
          style={{ minWidth: 200 }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Play className="h-4 w-4 text-gray-500" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--text)]">Output</div>
              <div className="text-[11px] text-gray-500">
                {enabledCount} step{enabledCount !== 1 ? 's' : ''} in pipeline
              </div>
            </div>
            {enabledCount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-gray-500">Ready</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Picker Modal */}
      <Modal open={showPicker} onClose={() => setShowPicker(false)} title="Add Pipeline Step">
        <div className="p-5">
          <MiniAppPicker onAdd={handleAdd} />
        </div>
      </Modal>
    </div>
  );
}
