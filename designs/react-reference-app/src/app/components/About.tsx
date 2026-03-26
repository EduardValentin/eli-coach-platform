import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Button } from './ThemeButton';
import { InstagramWidget } from './InstagramWidget';

export function About() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24 overflow-hidden" id="about">
      {/* Left: Content */}
      <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative w-48 h-48 md:w-56 md:h-56 rounded-full p-2 mb-8 group"
        >
          {/* Glowing border effect */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#C81D6B] to-[#00796B] opacity-70 group-hover:opacity-100 transition-opacity blur-md" />
          <div className="absolute inset-[3px] bg-white rounded-full z-10" />
          <img 
            src="https://images.unsplash.com/photo-1757347398206-7425300ef990?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicnVuZXR0ZSUyMHNtaWxpbmclMjB3b21hbiUyMHBvcnRyYWl0JTIwb3V0ZG9vcnxlbnwxfHx8fDE3NzQ0MzE3MDR8MA&ixlib=rb-4.1.0&q=80&w=1080" 
            alt="Eli Portrait"
            className="relative z-20 w-full h-full object-cover rounded-full"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="text-sm font-semibold tracking-widest uppercase text-neutral-500 mb-2 block">
            Personal Trainer • Virtual Sessions
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#121212] mb-6">
            Meet Eli
          </h2>
          <div className="space-y-4 text-neutral-600 text-lg leading-relaxed max-w-xl">
            <p>
              I help busy women feel strong, confident, and pain-free—without the gym. I'm ACE-certified with 7+ years coaching and 600+ client programs delivered entirely online.
            </p>
            <p>
              My sessions are short, personalized, and fit around your schedule; all you need is a mat, a kettlebell, and 30 minutes. Whether you're rebuilding after a break, training around a busy job, or chasing a first pull-up, I'll guide you step-by-step with clear form videos and weekly check-ins.
            </p>
            <p className="font-medium text-[#121212] pt-2">
              Ready to start? Let's build a plan you can actually stick to.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-8 text-sm font-medium text-neutral-700">
            <span className="flex items-center gap-1.5"><span className="text-[#C81D6B]">✔</span> ACE-Certified</span>
            <span className="flex items-center gap-1.5"><span className="text-[#C81D6B]">✔</span> Women-focused</span>
            <span className="flex items-center gap-1.5"><span className="text-[#C81D6B]">✔</span> Happy-clients</span>
          </div>

          <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start">
            <Link to="/book" className="inline-block">
              <Button size="lg" className="rounded-full px-8">Start my plan</Button>
            </Link>
            <a href="#" className="text-sm font-semibold text-neutral-500 hover:text-[#C81D6B] underline underline-offset-4 transition-colors">
              See pricing
            </a>
          </div>
        </motion.div>
      </div>

      {/* Right: IG Widget */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="flex-1 w-full flex justify-center lg:justify-end"
      >
        <InstagramWidget />
      </motion.div>
    </section>
  );
}
