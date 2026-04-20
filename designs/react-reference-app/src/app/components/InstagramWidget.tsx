import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Send, MoreHorizontal } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';

const stories = [
  "https://images.unsplash.com/photo-1758599879895-97aa69b6dd83?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGhvbWUlMjB3b3Jrb3V0JTIwbGl2aW5nJTIwcm9vbXxlbnwxfHx8fDE3NzQzNjY1MTR8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1594269807754-7b7926246d65?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21lbiUyMGZpdG5lc3MlMjB0cmFpbmluZyUyMHN0cm9uZ3xlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
  "https://images.unsplash.com/photo-1661257711676-79a0fc533569?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwY29sb3JmdWwlMjBmb29kJTIwbnV0cml0aW9uJTIwYm93bHxlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080",
];

export function InstagramWidget() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setProgress(0);
    setIsLiked(false);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setIsLiked(false);
    }
  };

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  return (
    <PhoneFrame
      statusBarVariant="light"
      className="w-full max-w-[280px] lg:max-w-[340px] aspect-[9/16] shrink-0 mx-auto lg:mx-0"
    >
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={handleTap}
        aria-label="Instagram stories — tap left or right to navigate"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') handlePrev();
          if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
        }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            src={stories[currentIndex]}
            alt={`Story ${currentIndex + 1} of ${stories.length}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </AnimatePresence>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none"
        />
      </div>

      <div className="absolute top-12 left-0 right-0 px-4 flex gap-1 z-40 pointer-events-none">
        {stories.map((_, idx) => (
          <div key={idx} className="h-[3px] flex-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-75 ease-linear"
              style={{
                width: `${idx < currentIndex ? 100 : idx === currentIndex ? progress : 0}%`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-[70px] left-0 right-0 px-4 flex justify-between items-center z-40 pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-white overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1757347398206-7425300ef990?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicnVuZXR0ZSUyMHNtaWxpbmclMjB3b21hbiUyMHBvcnRyYWl0JTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=108"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <span className="text-white text-sm font-medium">eli.fitness</span>
          <span className="text-white/60 text-xs ml-1">4h</span>
        </div>
        <MoreHorizontal className="text-white w-5 h-5" aria-hidden="true" />
      </div>

      <div className="absolute bottom-4 left-0 right-0 px-4 flex items-center gap-3 z-40">
        <div className="flex-1 border border-white/40 rounded-full px-3.5 py-1.5 text-white/80 text-xs backdrop-blur-sm pointer-events-none">
          Send message…
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked((v) => !v);
          }}
          className="outline-none"
          aria-label={isLiked ? 'Unlike story' : 'Like story'}
        >
          <Heart
            className={`w-5 h-5 transition-colors ${
              isLiked ? 'fill-brand text-brand' : 'text-white'
            }`}
            aria-hidden="true"
          />
        </button>
        <button className="outline-none" aria-label="Share story">
          <Send className="w-5 h-5 text-white" aria-hidden="true" />
        </button>
      </div>
    </PhoneFrame>
  );
}
