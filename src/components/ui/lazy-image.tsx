import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  threshold?: number;
  rootMargin?: string;
}

/**
 * LazyImage - Image component with lazy loading and intersection observer
 *
 * Features:
 * - Lazy loads images when they enter viewport
 * - Shows skeleton placeholder while loading
 * - Supports all standard img attributes
 * - Reduces initial page load by deferring off-screen images
 *
 * @example
 * ```tsx
 * <LazyImage
 *   src="/path/to/image.jpg"
 *   alt="Description"
 *   className="w-full h-48 object-cover"
 * />
 * ```
 */
export function LazyImage({
  src,
  alt,
  className,
  placeholderClassName,
  threshold = 0.1,
  rootMargin = '50px',
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div className={cn('relative', className)} ref={imgRef}>
      {!isLoaded && (
        <Skeleton
          className={cn(
            'absolute inset-0 w-full h-full',
            placeholderClassName
          )}
        />
      )}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onLoad={handleLoad}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
}

/**
 * Preload critical images (above the fold)
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}
