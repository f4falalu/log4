/**
 * PaginationControls Component - Standardized Pagination UI
 *
 * This component provides consistent pagination controls across all data tables and lists.
 * It standardizes:
 * - Page information display ("Showing X to Y of Z")
 * - Previous/Next button styling and behavior
 * - Disabled states
 * - Accessibility
 *
 * Usage:
 * ```tsx
 * <PaginationControls
 *   currentPage={0}
 *   totalPages={10}
 *   pageSize={50}
 *   totalItems={500}
 *   onPageChange={(newPage) => setPage(newPage)}
 * />
 * ```
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PaginationControlsProps {
  /**
   * Current page number (0-indexed)
   */
  currentPage: number;

  /**
   * Total number of pages
   */
  totalPages: number;

  /**
   * Number of items per page
   */
  pageSize: number;

  /**
   * Total number of items across all pages
   */
  totalItems: number;

  /**
   * Callback when page changes
   */
  onPageChange: (page: number) => void;

  /**
   * Optional custom className for the container
   */
  className?: string;

  /**
   * Optional loading state
   */
  isLoading?: boolean;
}

// ============================================================================
// PaginationControls Component
// ============================================================================

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  className,
  isLoading = false,
}: PaginationControlsProps) {
  // Calculate display values
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems);
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage >= totalPages - 1;

  // Handle page navigation
  const handlePrevious = () => {
    if (!isFirstPage && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLastPage && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  // Don't render if no pagination needed
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4',
        className
      )}
    >
      {/* Page Info */}
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </p>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevious}
          disabled={isFirstPage || isLoading}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {/* Page Counter */}
        <span className="text-sm font-medium px-2">
          Page {currentPage + 1} of {totalPages}
        </span>

        {/* Next Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={isLastPage || isLoading}
          aria-label="Go to next page"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Utility Hook for Pagination State
// ============================================================================

/**
 * Custom hook to manage pagination state
 *
 * Usage:
 * ```tsx
 * const pagination = usePagination({
 *   initialPage: 0,
 *   pageSize: 50,
 *   totalItems: data?.length || 0,
 * });
 *
 * // In your component
 * const paginatedData = data.slice(
 *   pagination.startIndex,
 *   pagination.endIndex
 * );
 *
 * <PaginationControls {...pagination} />
 * ```
 */
export function usePagination({
  initialPage = 0,
  pageSize = 50,
  totalItems = 0,
}: {
  initialPage?: number;
  pageSize?: number;
  totalItems: number;
}) {
  const [currentPage, setCurrentPage] = React.useState(initialPage);

  // Calculate derived values
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = currentPage * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  // Reset to first page if total items change
  React.useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(0);
    }
  }, [totalItems, currentPage, totalPages]);

  return {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    startIndex,
    endIndex,
    onPageChange: setCurrentPage,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default PaginationControls;
