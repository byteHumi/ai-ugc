import { NextRequest, NextResponse } from 'next/server';
import { getTemplateJob, initDatabase } from '@/lib/db';
import { getSignedUrlFromPublicUrl } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await initDatabase();
    const { id } = await params;
    const job = await getTemplateJob(id);
    if (!job) {
      return NextResponse.json({ error: 'Template job not found' }, { status: 404 });
    }

    let signedUrl: string | undefined;
    if (job.outputUrl && job.outputUrl.includes('storage.googleapis.com')) {
      try {
        signedUrl = await getSignedUrlFromPublicUrl(job.outputUrl);
      } catch {
        signedUrl = job.outputUrl;
      }
    }

    return NextResponse.json({ ...job, signedUrl });
  } catch (err) {
    console.error('Get template job error:', err);
    return NextResponse.json({ error: 'Failed to get template job' }, { status: 500 });
  }
}
