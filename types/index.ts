export type Job = {
  id: string;
  tiktokUrl?: string;
  videoUrl?: string;
  videoSource?: 'tiktok' | 'upload';
  imageUrl: string;
  imageName?: string;
  status: string;
  step: string;
  outputUrl?: string;
  signedUrl?: string;
  createdAt: string;
};

export type Post = {
  _id: string;
  content?: string;
  scheduledFor?: string;
  createdAt?: string;
  mediaItems?: { url?: string; thumbnailUrl?: string }[];
  platforms?: { platform: string; status?: string; platformPostUrl?: string }[];
};

export type Profile = {
  _id: string;
  name: string;
  description?: string;
  color?: string;
};

export type Account = {
  _id: string;
  platform: string;
  username?: string;
  displayName?: string;
  profilePicture?: string;
  createdAt?: string;
  profileId?: { _id: string } | string;
};

export type Model = {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  imageCount?: number;
  createdAt?: string;
};

export type ModelImage = {
  id: string;
  modelId: string;
  gcsUrl: string;
  signedUrl?: string;
  filename: string;
  isPrimary?: boolean;
};

export type Batch = {
  id: string;
  name: string;
  status: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  progress?: number;
  model?: { id: string; name: string; avatarUrl?: string };
  jobs?: Job[];
  createdAt?: string;
};

// Templates / Pipeline types

export type MiniAppType = 'video-generation' | 'text-overlay' | 'bg-music' | 'attach-video';

export type VideoGenMode = 'motion-control' | 'subtle-animation';

export type VideoGenConfig = {
  mode: VideoGenMode;
  modelId?: string;
  imageId?: string;
  imageUrl?: string;
  prompt?: string;
  maxSeconds?: number;
};

export type TextOverlayConfig = {
  text: string;
  position: 'top' | 'center' | 'bottom' | 'custom';
  customX?: number;       // 0-100 percentage
  customY?: number;       // 0-100 percentage
  fontSize: number;
  fontColor: string;
  fontFamily?: string;
  textStyle?: string;     // style preset id
  bgColor?: string;
  entireVideo?: boolean;
  startTime?: number;
  duration?: number;
};

export type BgMusicConfig = {
  trackId?: string;
  customTrackUrl?: string;
  volume: number;
  fadeIn?: number;
  fadeOut?: number;
};

export type AttachVideoConfig = {
  videoUrl: string;
  position: 'before' | 'after';
  sourceStepId?: string;
  tiktokUrl?: string;
};

export type MiniAppStep = {
  id: string;
  type: MiniAppType;
  config: VideoGenConfig | TextOverlayConfig | BgMusicConfig | AttachVideoConfig;
  enabled: boolean;
};

export type TemplateJob = {
  id: string;
  name: string;
  status: string;
  currentStep: number;
  totalSteps: number;
  step: string;
  pipeline: MiniAppStep[];
  videoSource: 'tiktok' | 'upload';
  tiktokUrl?: string;
  videoUrl?: string;
  outputUrl?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
};

export type MusicTrack = {
  id: string;
  name: string;
  gcsUrl: string;
  duration?: number;
  isDefault: boolean;
  createdAt: string;
};

export type TemplatePreset = {
  id: string;
  name: string;
  description?: string;
  pipeline: MiniAppStep[];
  createdAt: string;
  updatedAt: string;
};
