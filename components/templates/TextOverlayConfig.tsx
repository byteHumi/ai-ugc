'use client';

import { useRef, useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TextOverlayConfig as TOC } from '@/types';
import { TEXT_STYLES, FONTS } from './textStyles';

const textSwatches = ['#FFFFFF', '#000000', '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'];
const bgSwatches   = ['#000000', '#FFFFFF', '#1F2937', '#3B82F6', '#EF4444', '#F59E0B'];

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[var(--border)] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="text-xs font-semibold text-[var(--text)]">{title}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && <div className="pb-4">{children}</div>}
    </div>
  );
}

export default function TextOverlayConfig({
  config, onChange,
}: {
  config: TOC;
  onChange: (c: TOC) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);

  const handlePadPointer = useCallback((e: React.PointerEvent) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onChange({ ...config, customX: Math.round(x), customY: Math.round(y) });
  }, [config, onChange]);

  const handlePadDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    handlePadPointer(e);
  }, [handlePadPointer]);

  return (
    <div>
      {/* Text — always visible, not collapsible */}
      <div className="pb-4 border-b border-[var(--border)]">
        <label className="mb-1.5 block text-xs font-semibold text-[var(--text)]">Text</label>
        <div className="relative">
          <textarea
            value={config.text}
            onChange={(e) => onChange({ ...config, text: e.target.value })}
            placeholder="Enter overlay text\u2026"
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-gray-400 transition-colors focus:border-gray-400 focus:outline-none"
          />
          {config.text && (
            <span className="absolute bottom-2 right-2 text-[10px] tabular-nums text-gray-400">{config.text.length}</span>
          )}
        </div>
      </div>

      {/* Style */}
      <Section title="Style" defaultOpen={false}>
        <div className="grid grid-cols-3 gap-1.5">
          {TEXT_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onChange({ ...config, textStyle: style.id })}
              className={`relative flex items-center justify-center rounded-lg border py-2.5 px-2 text-[11px] font-medium transition-all duration-150 ${
                (config.textStyle || 'plain') === style.id
                  ? 'border-gray-900 bg-gray-50 shadow-sm'
                  : 'border-[var(--border)] hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span style={{ ...style.css, fontSize: '11px', lineHeight: '1' }}>
                {style.name}
              </span>
              {(config.textStyle || 'plain') === style.id && (
                <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-gray-900" />
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* Font */}
      <Section title="Font" defaultOpen={false}>
        <div className="space-y-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {FONTS.map((font) => (
              <button
                key={font.family}
                onClick={() => onChange({ ...config, fontFamily: font.family })}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs transition-all duration-150 ${
                  (config.fontFamily || 'sans-serif') === font.family
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-[var(--border)] text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
                style={{ fontFamily: font.family }}
              >
                {font.name}
              </button>
            ))}
          </div>

          {/* Font Size */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] text-gray-500">Size</label>
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] tabular-nums font-medium text-gray-600">
                {config.fontSize}px
              </span>
            </div>
            <input
              type="range" min={24} max={96}
              value={config.fontSize}
              onChange={(e) => onChange({ ...config, fontSize: parseInt(e.target.value) })}
              className="w-full" style={{ accentColor: '#111827' }}
            />
            <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
              <span>24</span><span>96</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Position */}
      <Section title="Position">
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(['top', 'center', 'bottom', 'custom'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => onChange({ ...config, position: pos, ...(pos === 'custom' && !config.customX ? { customX: 50, customY: 50 } : {}) })}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium capitalize transition-all duration-150 ${
                  config.position === pos
                    ? 'bg-gray-900 text-white'
                    : 'border border-[var(--border)] text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {config.position === 'custom' && (
            <div>
              <div
                ref={padRef}
                className="relative mx-auto cursor-crosshair overflow-hidden rounded-xl border border-[var(--border)] bg-gray-950"
                style={{ aspectRatio: '9/16', maxHeight: 180 }}
                onPointerDown={handlePadDown}
                onPointerMove={(e) => { if (e.buttons > 0) handlePadPointer(e); }}
              >
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute left-1/3 top-0 h-full w-px bg-gray-500" />
                  <div className="absolute left-2/3 top-0 h-full w-px bg-gray-500" />
                  <div className="absolute left-0 top-1/3 h-px w-full bg-gray-500" />
                  <div className="absolute left-0 top-2/3 h-px w-full bg-gray-500" />
                </div>
                <div
                  className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${config.customX ?? 50}%`, top: `${config.customY ?? 50}%` }}
                >
                  <div className="absolute inset-0 rounded-full border-2 border-white shadow-lg" />
                  <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                </div>
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-gray-400">
                <span>X: {config.customX ?? 50}%</span>
                <span>Y: {config.customY ?? 50}%</span>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Color */}
      <Section title="Color">
        <div className="space-y-4">
          {/* Text color */}
          <div>
            <label className="mb-2 block text-[11px] text-gray-500">Text Color</label>
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1.5">
                {textSwatches.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ ...config, fontColor: c })}
                    className={`h-7 w-7 rounded-lg transition-all duration-100 ${
                      config.fontColor.toUpperCase() === c ? 'ring-2 ring-gray-900 ring-offset-2' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c, boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px #e5e7eb' : undefined }}
                  />
                ))}
              </div>
              <div className="relative">
                <input
                  type="color" value={config.fontColor}
                  onChange={(e) => onChange({ ...config, fontColor: e.target.value })}
                  className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0"
                />
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-gray-300"
                >
                  <span className="text-[10px] text-gray-400">+</span>
                </div>
              </div>
            </div>
          </div>

          {/* Background */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-gray-500">Background Box</label>
              <button
                onClick={() => onChange({ ...config, bgColor: config.bgColor ? undefined : '#000000' })}
                className={`relative h-6 w-11 rounded-full transition-colors duration-300 ease-in-out ${config.bgColor ? 'bg-gray-900' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-300 ease-in-out ${config.bgColor ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {config.bgColor && (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="flex gap-1.5">
                  {bgSwatches.map((c) => (
                    <button
                      key={c}
                      onClick={() => onChange({ ...config, bgColor: c })}
                      className={`h-6 w-6 rounded-md transition-all duration-100 ${
                        config.bgColor?.toUpperCase() === c ? 'ring-2 ring-gray-900 ring-offset-2' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c, boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px #e5e7eb' : undefined }}
                    />
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="color" value={config.bgColor}
                    onChange={(e) => onChange({ ...config, bgColor: e.target.value })}
                    className="absolute inset-0 h-6 w-6 cursor-pointer opacity-0"
                  />
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-gray-300">
                    <span className="text-[10px] text-gray-400">+</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Timing */}
      <Section title="Timing">
        <div className="space-y-3">
          {/* Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
            <div>
              <p className="text-xs font-medium text-[var(--text)]">Entire Video</p>
              <p className="mt-0.5 text-[10px] text-gray-400">Apply text for full duration</p>
            </div>
            <button
              onClick={() => onChange({ ...config, entireVideo: !config.entireVideo, startTime: undefined, duration: undefined })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ease-in-out ${config.entireVideo ? 'bg-gray-900' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-300 ease-in-out ${config.entireVideo ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Time range inputs */}
          {!config.entireVideo && (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] text-gray-400">Start (s)</label>
                <input
                  type="number" min={0} step={0.5}
                  value={config.startTime ?? ''}
                  onChange={(e) => onChange({ ...config, startTime: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="0"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums text-[var(--text)] placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] text-gray-400">Duration (s)</label>
                <input
                  type="number" min={0.5} step={0.5}
                  value={config.duration ?? ''}
                  onChange={(e) => onChange({ ...config, duration: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Full"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm tabular-nums text-[var(--text)] placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
