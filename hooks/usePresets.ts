'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TemplatePreset, MiniAppStep } from '@/types';

export function usePresets() {
  const [presets, setPresets] = useState<TemplatePreset[]>([]);

  const loadPresets = useCallback(async () => {
    try {
      const res = await fetch('/api/template-presets');
      const data = await res.json();
      setPresets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load presets:', e);
    }
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const savePreset = useCallback(async (name: string, pipeline: MiniAppStep[], description?: string) => {
    const res = await fetch('/api/template-presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, pipeline, description }),
    });
    if (!res.ok) throw new Error('Failed to save preset');
    await loadPresets();
  }, [loadPresets]);

  const deletePreset = useCallback(async (id: string) => {
    await fetch(`/api/template-presets/${id}`, { method: 'DELETE' });
    await loadPresets();
  }, [loadPresets]);

  return { presets, savePreset, deletePreset, refresh: loadPresets };
}
