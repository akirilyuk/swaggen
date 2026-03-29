import { Play } from 'lucide-react';
import type { BaseRendererProps, ComponentSettingDef } from './types';
import { readProp } from './types';

export const SETTINGS: ComponentSettingDef[] = [
  {
    key: 'src',
    label: 'Video URL',
    type: 'text',
    placeholder: 'https://example.com/video.mp4',
  },
  {
    key: 'poster',
    label: 'Poster Image URL',
    type: 'text',
    placeholder: 'https://example.com/poster.jpg',
  },
  {
    key: 'controls',
    label: 'Show Controls',
    type: 'toggle',
    defaultValue: true,
  },
  {
    key: 'autoplay',
    label: 'Autoplay',
    type: 'toggle',
    defaultValue: false,
  },
  {
    key: 'loop',
    label: 'Loop',
    type: 'toggle',
    defaultValue: false,
  },
  {
    key: 'muted',
    label: 'Muted',
    type: 'toggle',
    defaultValue: false,
  },
];

export function VideoRenderer({ component }: BaseRendererProps) {
  const src = readProp<string>(component, 'src', '');
  const poster = readProp<string>(component, 'poster', '');
  const controls = readProp<boolean>(component, 'controls', true);
  const autoplay = readProp<boolean>(component, 'autoplay', false);
  const loop = readProp<boolean>(component, 'loop', false);
  const muted = readProp<boolean>(component, 'muted', false);

  if (!src) {
    return (
      <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <div className="text-center text-zinc-400">
          <Play size={32} className="mx-auto mb-2" />
          <span className="text-xs">No video URL set</span>
        </div>
      </div>
    );
  }

  return (
    <video
      src={src}
      poster={poster || undefined}
      controls={controls}
      autoPlay={autoplay}
      loop={loop}
      muted={muted}
      className="w-full rounded-lg"
    >
      Your browser does not support the video tag.
    </video>
  );
}
