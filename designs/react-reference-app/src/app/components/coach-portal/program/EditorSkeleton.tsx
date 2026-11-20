import { useId } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../ui/button';
import { Skeleton } from '../../ui/skeleton';
import { EditorShell } from './EditorShell';

const RAIL_ENTRIES = 3;
const BLOCK_ROWS = 3;

type EditorSkeletonProps = { clientPath: string; clientName: string };

export function EditorSkeleton({ clientPath, clientName }: EditorSkeletonProps) {
  const headingId = useId();
  return (
    <EditorShell>
      <div className="flex min-h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-3 py-2 lg:px-6">
        <nav aria-label="Editor" className="flex shrink-0 items-center">
          <Button asChild variant="ghost" size="icon-sm">
            <Link to={clientPath} aria-label={`Back to ${clientName}`}>
              <ArrowLeft size={20} />
            </Link>
          </Button>
        </nav>
        <div aria-hidden="true" className="grid min-w-0 flex-1 grid-cols-1 gap-1.5">
          <Skeleton className="h-3 w-32 max-w-full" />
          <Skeleton className="h-5 w-48 max-w-full" />
        </div>
        <Skeleton aria-hidden="true" className="h-10 w-24 shrink-0" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div aria-hidden="true" className="hidden w-72 shrink-0 flex-col gap-6 border-r border-border bg-card p-3 lg:flex">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full rounded-card" />
          <div className="grid gap-2">
            {Array.from({ length: RAIL_ENTRIES }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        </div>
        <main aria-labelledby={headingId} className="min-w-0 flex-1 bg-surface-page p-4 lg:p-6">
          <h1 id={headingId} className="sr-only">
            Program editor
          </h1>
          <p role="status" className="sr-only">
            Loading the program editor
          </p>
          <div aria-hidden="true" className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6">
            <Skeleton className="ml-auto h-10 w-80 max-w-full" />
            <Skeleton className="h-48 w-full rounded-card" />
            <div className="grid gap-3">
              {Array.from({ length: BLOCK_ROWS }, (_, index) => (
                <Skeleton key={index} className="h-16 w-full rounded-card" />
              ))}
            </div>
          </div>
        </main>
      </div>
    </EditorShell>
  );
}
