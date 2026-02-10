import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { TextOverlayConfig, BgMusicConfig } from '@/types';

function getTempDir(): string {
  const dir = path.join(os.tmpdir(), 'ai-ugc-temp');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Word-wrap text to fit within a max character width per line.
 */
function wrapText(text: string, maxChars: number): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (line.length === 0) {
      line = word;
    } else if (line.length + 1 + word.length <= maxChars) {
      line += ' ' + word;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

/**
 * Burn text onto a video using ffmpeg drawtext filter.
 */
export function addTextOverlay(
  inputPath: string,
  outputPath: string,
  config: TextOverlayConfig
): void {
  const {
    text, position, fontSize = 48, fontColor = '#FFFFFF', bgColor,
    paddingLeft = 0, paddingRight = 0,
    startTime, duration,
  } = config;

  // Word-wrap text if left/right margins are set.
  // ffmpeg drawtext has no auto-wrap, so we insert newlines manually.
  // Assume 720px video width; average char width ≈ fontSize * 0.55
  let wrappedText = text;
  if (paddingLeft > 0 || paddingRight > 0) {
    const videoWidth = 720;
    const availableWidth = videoWidth - paddingLeft - paddingRight;
    const charWidth = fontSize * 0.55;
    const maxCharsPerLine = Math.max(5, Math.floor(availableWidth / charWidth));
    wrappedText = wrapText(text, maxCharsPerLine);
  }

  // Horizontal offset if left/right margins differ
  const hOffset = (paddingLeft - paddingRight) / 2;
  const xExpr = hOffset === 0
    ? '(w-text_w)/2'
    : `(w-text_w)/2+${hOffset}`;

  // Vertical position
  let yExpr: string;
  switch (position) {
    case 'top':
      yExpr = '50';
      break;
    case 'center':
      yExpr = '(h-text_h)/2';
      break;
    case 'bottom':
    default:
      yExpr = 'h-text_h-50';
      break;
  }

  // Escape text for ffmpeg drawtext (escape single quotes and backslashes)
  const escapedText = wrappedText.replace(/\\/g, '\\\\').replace(/'/g, "'\\''").replace(/:/g, '\\:');

  let filter = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${xExpr}:y=${yExpr}`;

  if (bgColor) {
    filter += `:box=1:boxcolor=${bgColor}@0.7:boxborderw=10`;
  }

  // Time-based enable
  if (startTime !== undefined || duration !== undefined) {
    const start = startTime || 0;
    if (duration !== undefined) {
      filter += `:enable='between(t,${start},${start + duration})'`;
    } else {
      filter += `:enable='gte(t,${start})'`;
    }
  }

  execFileSync('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-vf', filter,
    '-c:a', 'copy',
    outputPath,
  ]);
}

/**
 * Mix a background music track into a video using ffmpeg amix filter.
 */
export function mixAudio(
  inputPath: string,
  audioPath: string,
  outputPath: string,
  config: BgMusicConfig
): void {
  const { volume = 30, fadeIn, fadeOut } = config;
  const vol = volume / 100;

  // Get video duration for fade-out calculation
  let videoDuration = 0;
  try {
    const output = execFileSync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      inputPath,
    ], { encoding: 'utf-8' });
    videoDuration = parseFloat(output.trim()) || 0;
  } catch {
    // If we can't get duration, proceed without fade-out
  }

  // Build audio filter chain for the music track
  let audioFilter = `[1:a]volume=${vol}`;
  if (fadeIn) {
    audioFilter += `,afade=t=in:d=${fadeIn}`;
  }
  if (fadeOut && videoDuration > 0) {
    const fadeOutStart = Math.max(0, videoDuration - fadeOut);
    audioFilter += `,afade=t=out:st=${fadeOutStart}:d=${fadeOut}`;
  }
  audioFilter += '[a1]';

  // Check if input video has audio
  let hasAudio = true;
  try {
    const probeOut = execFileSync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'a',
      '-show_entries', 'stream=index',
      '-of', 'csv=p=0',
      inputPath,
    ], { encoding: 'utf-8' });
    hasAudio = probeOut.trim().length > 0;
  } catch {
    hasAudio = false;
  }

  if (hasAudio) {
    execFileSync('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-i', audioPath,
      '-filter_complex', `${audioFilter};[0:a][a1]amix=inputs=2:duration=first`,
      '-c:v', 'copy',
      outputPath,
    ]);
  } else {
    // No existing audio — just use the music track
    execFileSync('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-i', audioPath,
      '-filter_complex', `${audioFilter}`,
      '-map', '0:v',
      '-map', '[a1]',
      '-c:v', 'copy',
      '-shortest',
      outputPath,
    ]);
  }
}

/**
 * Concatenate multiple videos using ffmpeg concat demuxer.
 * Tries stream copy first, falls back to re-encode.
 */
export function concatVideos(videoPaths: string[], outputPath: string): void {
  const tempDir = getTempDir();
  const listFile = path.join(tempDir, `concat-${Date.now()}.txt`);

  try {
    // Write concat list file
    const listContent = videoPaths.map((p) => `file '${p}'`).join('\n');
    fs.writeFileSync(listFile, listContent);

    try {
      // Try stream copy first (fast, but only works with same codecs)
      execFileSync('ffmpeg', [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', listFile,
        '-c', 'copy',
        outputPath,
      ]);
    } catch {
      // Fall back to re-encode (slower but handles different codecs)
      console.log('[FFmpeg] Concat copy failed, re-encoding...');
      execFileSync('ffmpeg', [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', listFile,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-c:a', 'aac',
        outputPath,
      ]);
    }
  } finally {
    try { fs.unlinkSync(listFile); } catch {}
  }
}
