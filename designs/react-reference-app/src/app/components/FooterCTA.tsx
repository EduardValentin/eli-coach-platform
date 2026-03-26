import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Button } from './ThemeButton';

export function FooterCTA() {
  const containerRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [150, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  return (
    <section 
      ref={containerRef} 
      className="bg-[#FFF5F8] border-t border-[#FEE2EB] overflow-hidden text-neutral-900 py-28 px-6 text-center"
    >
      <motion.div style={{ y, opacity }} className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif font-medium mb-6 text-[#C81D6B]">
          Not ready for 1-on-1 coaching?
        </h2>
        <p className="text-lg text-neutral-600 mb-10 max-w-xl mx-auto">
          That's okay. You can start feeling better today with our free workout challenges, recipes, and e-books.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" variant="primary" className="w-full sm:w-auto px-8">
            Explore Free Products
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
            View Paid Plans
          </Button>
        </div>
      </motion.div>
    </section>
  );
}