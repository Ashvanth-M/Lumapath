import { Baby } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown in place of a page's content when no child profile is available yet —
 * either the session is still loading, or the parent hasn't added a child.
 *
 * Pages that are about a specific child render this instead of falling back to
 * demo data, so an empty account never looks like a populated one.
 */
export function ChildGate({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <EmptyState
      icon={Baby}
      title="Add your child to get started"
      description="Screenings, progress and recommendations are all organised around a child profile. It takes about a minute to set up."
      actionLabel="Add child profile"
      actionTo="/onboarding/child"
    />
  );
}
