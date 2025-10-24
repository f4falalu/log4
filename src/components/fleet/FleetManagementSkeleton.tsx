import { Skeleton } from "@/components/ui/skeleton";

const FleetManagementSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>

    <div className="grid gap-6 md:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-lg border p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  </div>
);

export default FleetManagementSkeleton;
