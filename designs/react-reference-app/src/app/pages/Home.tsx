import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { Principles } from "../components/Principles";
import { WorkoutSchedule } from "../components/WorkoutSchedule";
import { CycleSyncing } from "../components/CycleSyncing";
import { FooterCTA } from "../components/FooterCTA";

export function Home() {
  return (
    <main className="w-full min-h-screen">
      <Navbar />
      <Hero />
      <About />
      <Principles />
      <WorkoutSchedule />
      <CycleSyncing />
      <FooterCTA />
    </main>
  );
}
