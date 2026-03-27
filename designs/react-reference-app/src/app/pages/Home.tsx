import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { Principles } from "../components/Principles";
import { WorkoutSchedule } from "../components/WorkoutSchedule";
import { CycleSyncing } from "../components/CycleSyncing";
import { FooterCTA } from "../components/FooterCTA";
import { useAppState } from "../context/AppContext";

export function Home() {
  const { appState } = useAppState();

  return (
    <main className="w-full min-h-screen">
      <Navbar />
      <Hero />
      <About />
      <Principles />
      {!appState.isWaitlistMode && (
        <>
          <WorkoutSchedule />
          <CycleSyncing />
        </>
      )}
      <FooterCTA />
    </main>
  );
}
