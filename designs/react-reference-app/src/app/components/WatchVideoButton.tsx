import { PlayCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

type WatchVideoButtonProps = { name: string; videoUrl: string };

export function WatchVideoButton({ name, videoUrl }: WatchVideoButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="xs" className="h-auto w-fit px-0 has-[>svg]:px-0">
          <PlayCircle aria-hidden="true" />
          Watch video
        </Button>
      </DialogTrigger>
      <DialogContent size="md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{name}</DialogTitle>
        </DialogHeader>
        <video src={videoUrl} controls playsInline preload="metadata" className="aspect-video w-full rounded-field bg-surface-inverted object-contain" />
      </DialogContent>
    </Dialog>
  );
}
