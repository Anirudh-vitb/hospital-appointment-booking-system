// Grey placeholder blocks shown while a list is loading, so the layout does
// not jump when the data arrives.
export function SkeletonLine({ className = '' }) {
  return <div className={`animate-pulse rounded bg-paper-deep ${className}`} />;
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card space-y-3 p-5">
          <div className="flex gap-3">
            <SkeletonLine className="size-12" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-4 w-2/3" />
              <SkeletonLine className="h-3 w-1/2" />
            </div>
          </div>
          <SkeletonLine className="h-3 w-full" />
          <SkeletonLine className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  );
}
