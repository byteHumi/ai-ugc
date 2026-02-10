'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import type { TemplateJob } from '@/types';
import Spinner from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';
import ProgressBar from '@/components/ui/ProgressBar';
import Modal from '@/components/ui/Modal';

export default function TemplateJobList({ jobs }: { jobs: TemplateJob[] }) {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<TemplateJob | null>(null);

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface)] p-8 text-center shadow-sm backdrop-blur-xl">
        <p className="text-[var(--text-muted)]">No template jobs yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {jobs.map((job) => {
          const isActive = job.status === 'queued' || job.status === 'processing';
          const hasVideo = job.status === 'completed' && job.outputUrl;
          const progress = job.totalSteps > 0 ? Math.round((job.currentStep / job.totalSteps) * 100) : 0;

          return (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`cursor-pointer rounded-lg p-3 shadow-sm backdrop-blur-xl transition-all hover:shadow-md ${
                isActive ? 'bg-blue-50/30 ring-1 ring-blue-200' : 'bg-[var(--surface)]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{job.name}</span>
                    <StatusBadge status={job.status} />
                  </div>

                  {isActive && (
                    <div className="mt-1.5">
                      <div className="mb-1 flex items-center gap-1 text-[10px] text-blue-600">
                        <Spinner className="h-3 w-3" />
                        {job.step}
                      </div>
                      <ProgressBar progress={progress} />
                    </div>
                  )}

                  {job.createdAt && (
                    <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                      {new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
                      {new Date(job.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                {hasVideo && (
                  <video
                    src={job.signedUrl || job.outputUrl}
                    className="h-16 w-12 shrink-0 rounded object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.1; }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.name || 'Template Job'}
        maxWidth="max-w-2xl"
      >
        {selectedJob && (
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <StatusBadge status={selectedJob.status} />
              {(selectedJob.status === 'queued' || selectedJob.status === 'processing') && (
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  <Spinner className="h-3 w-3" /> {selectedJob.step}
                </span>
              )}
            </div>

            {selectedJob.totalSteps > 0 && (
              <div className="mb-3">
                <div className="mb-1 text-xs text-[var(--text-muted)]">
                  Step {Math.min(selectedJob.currentStep + 1, selectedJob.totalSteps)} of {selectedJob.totalSteps}
                </div>
                <ProgressBar
                  progress={Math.round(((selectedJob.status === 'completed' ? selectedJob.totalSteps : selectedJob.currentStep) / selectedJob.totalSteps) * 100)}
                />
              </div>
            )}

            {/* Pipeline steps */}
            <div className="mb-3">
              <h4 className="mb-1 text-xs font-medium text-[var(--text-muted)]">Pipeline</h4>
              <div className="space-y-1">
                {selectedJob.pipeline.map((step, i) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 rounded px-2 py-1 text-xs ${
                      !step.enabled
                        ? 'text-[var(--text-muted)] line-through'
                        : i < selectedJob.currentStep
                          ? 'text-[var(--success)]'
                          : i === selectedJob.currentStep && selectedJob.status === 'processing'
                            ? 'font-medium text-blue-600'
                            : ''
                    }`}
                  >
                    <span className="w-4 text-center">{i + 1}.</span>
                    <span className="capitalize">{step.type.replace('-', ' ')}</span>
                    {!step.enabled && <span>(disabled)</span>}
                  </div>
                ))}
              </div>
            </div>

            {selectedJob.error && (
              <div className="mb-3 rounded-lg bg-[var(--error-bg)] p-3 text-sm text-[var(--error)]">
                {selectedJob.error}
              </div>
            )}

            {selectedJob.status === 'completed' && (selectedJob.signedUrl || selectedJob.outputUrl) && (
              <div>
                <h4 className="mb-1 text-xs font-medium text-[var(--text-muted)]">Output</h4>
                <video
                  src={selectedJob.signedUrl || selectedJob.outputUrl}
                  controls
                  className="w-full rounded-lg"
                  preload="metadata"
                />
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    router.push(`/posts?createPost=true&videoUrl=${encodeURIComponent(selectedJob.signedUrl || selectedJob.outputUrl!)}`);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                  Create Post
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
