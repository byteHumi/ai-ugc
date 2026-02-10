'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TemplateJob } from '@/types';

const REFRESH_INTERVAL = 60_000;
const ACTIVE_POLL_INTERVAL = 2_000;
const CACHE_KEY = 'ai-ugc-template-jobs';

function getCachedJobs(): TemplateJob[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function setCachedJobs(jobs: TemplateJob[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(jobs)); } catch {}
}

export function useTemplates() {
  const [jobs, setJobs] = useState<TemplateJob[]>(getCachedJobs);
  const activePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSnapshotRef = useRef('');

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      const arr: TemplateJob[] = Array.isArray(data) ? data : [];
      const snapshot = JSON.stringify(arr.map((j) => `${j.id}:${j.status}:${j.step}:${j.currentStep}`));
      if (snapshot !== lastSnapshotRef.current) {
        lastSnapshotRef.current = snapshot;
        setJobs(arr);
        setCachedJobs(arr);
      }
    } catch (e) {
      console.error('Failed to load template jobs:', e);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const id = setInterval(loadJobs, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [loadJobs]);

  useEffect(() => {
    const hasActive = jobs.some((j) => j.status === 'queued' || j.status === 'processing');
    if (hasActive && !activePollRef.current) {
      activePollRef.current = setInterval(loadJobs, ACTIVE_POLL_INTERVAL);
    } else if (!hasActive && activePollRef.current) {
      clearInterval(activePollRef.current);
      activePollRef.current = null;
    }
    return () => {
      if (activePollRef.current) {
        clearInterval(activePollRef.current);
        activePollRef.current = null;
      }
    };
  }, [jobs, loadJobs]);

  const refresh = useCallback(async () => {
    lastSnapshotRef.current = '';
    await loadJobs();
  }, [loadJobs]);

  return { jobs, refresh };
}
