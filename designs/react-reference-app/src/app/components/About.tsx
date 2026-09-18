import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Button } from './ThemeButton';
import { InstagramWidget } from './InstagramWidget';
import { useAppState } from '../context/AppContext';
import { SectionEyebrow } from './SectionEyebrow';
import { ELI_PORTRAIT_LARGE } from '../utils/eliPortrait';

export function About() {
  const { appState } = useAppState();

  return (
    <section className="py-24 px-6 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16 lg:gap-24" id="about">
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
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand to-brand-secondary opacity-70 group-hover:opacity-100 transition-opacity blur-md" />
          <div className="absolute inset-[3px] bg-white rounded-full z-10" />
          <img 
            src={ELI_PORTRAIT_LARGE}
            alt="Eli, personal trainer and nutritionist for women, smiling outdoors"
            width={208}
            height={208}
            className="relative z-20 w-full h-full object-cover rounded-full"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SectionEyebrow>Strength & nutrition for women</SectionEyebrow>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-foreground mb-6">
            Meet Eli, your coach
          </h2>
          <div className="space-y-4 text-copy-muted text-lg leading-relaxed max-w-xl">
            <p>
              I am a personal trainer and nutrition coach, working with women who want to build strength, improve their nutrition, and feel stronger and healthier.
            </p>
            <p>
              My approach is shaped by both my professional experience and my own personal journey with training, nutrition, and learning how to better understand my body.
            </p>
            <p>
              My goal is to give you the tools, structure, and support to build a healthier relationship with food, feel more connected to your body, and make progress in a way that feels realistic, flexible, and sustainable.
            </p>
            <p>
              I create training and nutrition plans around your goals, your menstrual cycle, your energy levels, and what your week actually looks like.
            </p>
            <p className="font-medium text-foreground pt-2">
              {appState.isWaitlistMode
                ? "Doors open soon. Get on the list so yours is held."
                : "Ready to start? Book a free 30-minute assessment call and let's see if we're a fit."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-8 text-sm font-medium text-text-label">
            <span className="flex items-center gap-1.5"><span className="text-brand">✔</span> IFBB Certified Trainer</span>
            <span className="flex items-center gap-1.5"><span className="text-brand">✔</span> Certified Nutritionist</span>
            <span className="flex items-center gap-1.5"><span className="text-brand">✔</span> Women Focused</span>
          </div>

          {!appState.isWaitlistMode && (
            <div className="flex items-center gap-6 mt-10 justify-center lg:justify-start">
              <Link to="/book" className="inline-block">
                <Button size="lg" className="rounded-xl px-8">Book a free call</Button>
              </Link>
              <Link to="/pricing" className="text-sm font-semibold text-link-muted hover:text-brand underline underline-offset-4 transition-colors">
                See pricing
              </Link>
            </div>
          )}
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
