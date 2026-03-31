interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  width?: string;
  className?: string;
}

export function LoadingSkeleton({
  count = 1,
  height = "h-12",
  width = "w-full",
  className = "",
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`${width} ${height} rounded-lg bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse`}
        />
      ))}
    </div>
  );
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex gap-4 p-4 rounded-lg border border-gray-200">
          <div className="h-10 w-10 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          </div>
          <div className="h-8 w-24 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function CardLoadingSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="h-6 w-1/3 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        <div className="h-4 w-4/6 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
      </div>
      <div className="flex gap-2 pt-4">
        <div className="h-8 w-20 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        <div className="h-8 w-20 rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
      </div>
    </div>
  );
}
