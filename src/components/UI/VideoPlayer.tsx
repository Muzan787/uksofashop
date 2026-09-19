'use client';
// src/components/UI/VideoPlayer.tsx

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { blurDataURL, videoPoster, videoSource } from '@/utils/cloudinary';

interface Props {
  /** The Cloudinary video URL as uploaded. Poster and stream are derived. */
  src: string;
  /** What the clip shows - read out as the poster's alt and the button's label. */
  title: string;
  /** From the upload. Sets the frame's shape when no `aspect` is forced. */
  width?: number | null;
  height?: number | null;
  /**
   * A fixed frame shape. The product gallery is square and wants its clip
   * in the same frame as the photographs; elsewhere the clip's own shape
   * is the right one - a phone clip stands tall, a studio pan lies wide.
   */
  aspect?: 'square' | 'natural';
  /** The poster's sizes attribute, as for any next/image. */
  sizes?: string;
  /** Off inside a frame that does its own clipping, like the phone carousel. */
  rounded?: boolean;
  className?: string;
}

/**
 * A clip that costs nothing until it is asked for.
 *
 * Before the tap this is a photograph - Cloudinary's first frame, through
 * next/image like every other picture on the site - and a play button. The
 * <video> element is not in the page at all, so no browser preloads a byte
 * of it. On the tap the poster is replaced by the player, which starts at
 * once because that tap is the user gesture autoplay policies want.
 *
 * Every visitor is on a phone and the site is on Cloudinary's free tier:
 * both of those say the same thing, which is that video bytes should move
 * only when somebody has chosen to watch.
 */
export default function VideoPlayer({
  src, title, width, height, aspect = 'natural', sizes = '100vw', rounded = true, className = '',
}: Props) {
  const [playing, setPlaying] = useState(false);
  const poster = videoPoster(src);

  // The frame. Square where asked; otherwise the clip's own proportions,
  // and 16:9 where the upload did not say.
  const ratio = aspect === 'square'
    ? '1 / 1'
    : width && height ? `${width} / ${height}` : '16 / 9';

  return (
    <div
      className={`relative w-full overflow-hidden bg-ink-900 ${rounded ? 'rounded-md' : ''} ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {playing ? (
        <video
          src={videoSource(src)}
          poster={videoPoster(src, 800)}
          controls
          autoPlay
          playsInline
          preload="auto"
          aria-label={title}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          <Image
            src={poster}
            alt={title}
            fill
            sizes={sizes}
            placeholder="blur"
            blurDataURL={blurDataURL(poster)}
            className="object-cover"
          />
          {/* A little shade under the button so it reads on a bright frame. */}
          <span aria-hidden="true" className="absolute inset-0 bg-ink-900/15 transition-colors duration-swift group-hover:bg-ink-900/25" />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-pill border border-calico-50/25 bg-ink-900/60 text-calico-50 shadow-e2 backdrop-blur transition-transform duration-swift ease-out-expo group-hover:scale-105"
          >
            <Play className="ml-1 h-7 w-7 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}
