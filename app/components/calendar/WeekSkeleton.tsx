import { Skeleton } from '~/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '~/components/ui/card';

export function WeekSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-10 w-[180px]" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Week summary card skeleton */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-4 border-t pt-2">
            <div className="space-y-1 text-center">
              <Skeleton className="mx-auto h-6 w-8" />
              <Skeleton className="h-3 w-14" />
            </div>
            <div className="space-y-1 text-center">
              <Skeleton className="mx-auto h-6 w-8" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Week grid skeleton — 7 columns */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="min-h-[200px] space-y-2 rounded-lg border bg-card p-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-20 w-full rounded-md" />
            {i % 3 !== 2 && <Skeleton className="h-16 w-full rounded-md" />}
          </div>
        ))}
      </div>
    </div>
  );
}
