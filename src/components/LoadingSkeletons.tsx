import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const SubjectCardSkeleton = () => (
  <Card>
    <CardHeader className="pb-2">
      <Skeleton className="h-6 w-3/4" />
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

export const NoteCardSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6 mt-2" />
    </CardContent>
  </Card>
);

export const DashboardSkeleton = () => (
  <div className="space-y-8">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 py-4 px-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <SubjectCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

export const NotesListSkeleton = () => (
  <div className="grid gap-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <NoteCardSkeleton key={i} />
    ))}
  </div>
);
