import { AlertCircle, Inbox } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function PageEmpty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <Inbox className="mb-4 h-10 w-10 text-gray-300" />
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}
