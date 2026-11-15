import { PlayCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

type WatchVideoButtonProps = { name: string; videoUrl: string; appearance?: 'text' | 'icon' };

export function WatchVideoButton({ name, videoUrl, appearance = 'text' }: WatchVideoButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {appearance === 'icon' ? (
          <Button variant="ghost" size="icon-xs" aria-label={`Watch ${name} video`}>
            <PlayCircle aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="link" size="xs" className="w-fit px-0 has-[>svg]:px-0">
            <PlayCircle aria-hidden="true" />
            Watch video
          </Button>
        )}
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
