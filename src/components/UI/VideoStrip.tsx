// src/components/UI/VideoStrip.tsx

import SectionHeading from '@/components/UI/SectionHeading';
import VideoPlayer from '@/components/UI/VideoPlayer';

export interface StripVideo {
  id: string;
  url: string;
  caption: string | null;
  width: number | null;
  height: number | null;
}

interface Props {
  videos: StripVideo[];
  eyebrow: string;
  heading: string;
  emphasise?: string;
  /** Used in the alt text where a clip has no caption of its own. */
  fallbackTitle: string;
  /** 'section' under a page's own h1; 'page' where the strip is the page. */
  level?: 'page' | 'section';
  className?: string;
}

/**
 * A row of clips with the site's section heading over it.
 *
 * On a phone it is a snapped carousel, one clip per screen with the next
 * peeking in from the right, which is the same shape as the product rows.
 * From md it is a grid: two across, or three when there are three or more,
 * so a single warehouse clip does not sit in a third of the width.
 *
 * Each clip keeps its own proportions - phone clips from customers stand
 * tall, studio pans lie wide - and the grid rows align to the tallest.
 * Renders nothing when there is nothing to show.
 */
export default function VideoStrip({
  videos, eyebrow, heading, emphasise, fallbackTitle, level = 'section', className = '',
}: Props) {
  if (!videos.length) return null;

  const cols = videos.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';

  return (
    <section aria-label={heading} className={className}>
      <SectionHeading
        eyebrow={eyebrow}
        heading={heading}
        emphasise={emphasise}
        level={level}
        className="mb-6 lg:mb-8"
      />

      <div className={`no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 md:mx-0 md:grid ${cols} md:items-start md:gap-6 md:overflow-visible md:px-0`}>
        {videos.map(v => (
          <figure key={v.id} className="m-0 w-[80vw] shrink-0 snap-start sm:w-[56vw] md:w-auto">
            <VideoPlayer
              src={v.url}
              title={v.caption || fallbackTitle}
              width={v.width}
              height={v.height}
              sizes="(max-width: 768px) 80vw, 400px"
            />
            {v.caption && (
              <figcaption className="mt-3 text-caption leading-relaxed text-ink-500">
                {v.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
