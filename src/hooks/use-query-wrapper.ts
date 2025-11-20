import { useQuery, UseQueryOptions, UseQueryResult, QueryKey } from '@tanstack/react-query';
import { handleError } from '@/lib/error-handler';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ReactNode } from 'react';

export type UseQueryWrapperOptions<TData, TError = Error> = Omit<
  UseQueryOptions<TData, TError, TData, QueryKey>,
  'queryKey' | 'queryFn'
> & {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  loadingComponent?: ReactNode;
  errorComponent?: (error: TError) => ReactNode;
};

export function useQueryWrapper<TData, TError = Error>({
  queryKey,
  queryFn,
  loadingComponent = <LoadingSpinner fullScreen />,
  errorComponent,
  onError,
  ...options
}: UseQueryWrapperOptions<TData, TError>) {
  const query = useQuery<TData, TError, TData, QueryKey>({
    queryKey,
    queryFn,
    ...options,
    onError: (error: TError) => {
      handleError(error);
      onError?.(error);
    },
  });

  const renderContent = (children: (data: TData) => ReactNode) => {
    if (query.isLoading) {
      return {
        ...query,
        data: undefined,
        isLoading: true as const,
        loadingComponent,
      } as const;
    }

    if (query.isError) {
      return {
        ...query,
        data: undefined,
        isError: true as const,
        error: query.error,
        errorComponent: errorComponent ? errorComponent(query.error) : undefined,
      } as const;
    }

    return query;
  };

  return {
    ...query,
    renderContent,
  };
}

// Example usage:
/*
const { data, isLoading, error, renderContent } = useQueryWrapper({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  loadingComponent: <div>Loading user...</div>,
  errorComponent: (error) => <div>Error loading user: {error.message}</div>,
});

// In your component's return:
return renderContent((user) => (
  <div>
    <h1>{user.name}</h1>
    <p>{user.email}</p>
  </div>
));
*/
