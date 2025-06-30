import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function SkeletonCard() {
  return (
    <Card className="h-full animate-pulse skeleton-card">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          {/* Avatar skeleton */}
          <div className="h-16 w-16 bg-gray-200 rounded-full" />

          {/* Name skeleton */}
          <div className="space-y-2 w-full">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>

          {/* Rating skeleton */}
          <div className="h-4 bg-gray-200 rounded w-1/3" />

          {/* Availability skeleton */}
          <div className="space-y-2 w-full">
            <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}