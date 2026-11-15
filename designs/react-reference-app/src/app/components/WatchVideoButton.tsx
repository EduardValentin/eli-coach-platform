import { PlayCircle } from 'lucide-react';
import { IconActionButton } from './IconActionButton';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

type WatchVideoButtonProps = { name: string; videoUrl: string; appearance?: 'text' | 'icon' };

export function WatchVideoButton({ name, videoUrl, appearance = 'text' }: WatchVideoButtonProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {appearance === 'icon' ? (
          <IconActionButton icon={PlayCircle} label={`Watch ${name} video`} hint="Watch video" />
        ) : (
          <Button variant="link" size="inline">
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
