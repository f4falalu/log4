import { useEffect, useRef } from 'react';

/**
 * Hook to prefetch route components on hover
 * Improves perceived performance by loading routes before navigation
 */
export function usePrefetch(loader: () => Promise<any>, enabled = true) {
  const prefetchedRef = useRef(false);

  const prefetch = () => {
    if (!prefetchedRef.current && enabled) {
      prefetchedRef.current = true;
      loader().catch(() => {
        // Reset on error so it can be retried
        prefetchedRef.current = false;
      });
    }
  };

  return { prefetch };
}

/**
 * Component wrapper that prefetches on hover
 */
export function PrefetchLink({
  to,
  children,
  onPrefetch,
  className,
  ...props
}: {
  to: string;
  children: React.ReactNode;
  onPrefetch?: () => void;
  className?: string;
  [key: string]: any;
}) {
  const handleMouseEnter = () => {
    if (onPrefetch) {
      onPrefetch();
    }
  };

  return (
    <a
      href={to}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleMouseEnter}
      className={className}
      {...props}
    >
      {children}
    </a>
  );
}
