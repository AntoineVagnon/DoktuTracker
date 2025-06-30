
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

export function SkeletonCard() {
  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar skeleton */}
          <Skeleton className="h-16 w-16 rounded-full" />
          
          {/* Name skeleton */}
          <div className="space-y-2 text-center w-full">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-24 mx-auto" />
          </div>
          
          {/* Rating skeleton */}
          <Skeleton className="h-5 w-16" />
          
          {/* Specialty skeleton */}
          <Skeleton className="h-4 w-28" />
          
          {/* Availability skeleton */}
          <div className="space-y-2 w-full">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
