import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { Platform } from "../components/Platform";
import { WorkoutSchedule } from "../components/WorkoutSchedule";
import { CycleSyncing } from "../components/CycleSyncing";
import { MyMethod } from "../components/MyMethod";
import { FooterCTA } from "../components/FooterCTA";
import { useAppState } from "../context/AppContext";

export function Home() {
  const { appState } = useAppState();

  return (
    <main className="w-full min-h-screen">
      <Navbar />
      <Hero />
      <About />
      {appState.prototypeMode === 'post-mvp' && <Platform />}
      <WorkoutSchedule />
      <CycleSyncing />
      <MyMethod />
      <FooterCTA />
    </main>
  );
}
