import type { ComponentType } from "react";
import { Droplet, Dumbbell, MessageCircle, Utensils } from "lucide-react";

type CapabilityIcon = ComponentType<{
  "aria-hidden"?: boolean | "true" | "false";
  className?: string;
  size?: number;
}>;

export type CapabilityId = "workouts" | "nutrition" | "chat" | "cycle";

export type Capability = {
  desktopPositionClassName: string;
  icon: CapabilityIcon;
  id: CapabilityId;
  label: string;
};

export const CAPABILITIES: Capability[] = [
  {
    id: "workouts",
    label: "Personalized workouts",
    icon: Dumbbell,
    desktopPositionClassName: "lg:top-4 lg:right-full lg:mr-3 xl:mr-5",
  },
  {
    id: "nutrition",
    label: "Nutrition planner",
    icon: Utensils,
    desktopPositionClassName: "lg:top-24 lg:left-full lg:ml-3 xl:ml-5",
  },
  {
    id: "chat",
    label: "Chat with your coach",
    icon: MessageCircle,
    desktopPositionClassName: "lg:bottom-28 lg:right-full lg:mr-3 xl:mr-5",
  },
  {
    id: "cycle",
    label: "Cycle tracking",
    icon: Droplet,
    desktopPositionClassName: "lg:bottom-8 lg:left-full lg:ml-3 xl:ml-5",
  },
];

export const WORKOUT_EXERCISES = [
  { detail: "4 sets · 8 reps", name: "Goblet Squat", number: "01" },
  { detail: "3 sets · 10 reps", name: "Romanian Deadlift", number: "02" },
  { detail: "4 sets · 12 reps", name: "Hip Thrust", number: "03" },
];

export const RECIPE_ROWS = [
  { duration: "25 min", name: "Lemon ginger salmon" },
  { duration: "20 min", name: "Warm quinoa bowl" },
];

export const SHOPPING_ITEMS = ["Wild salmon", "Baby spinach", "Sweet potato"];

export const CYCLE_DAYS = Array.from({ length: 28 }, (_, index) => index + 1);

export const PERIOD_DAYS = [1, 2, 3, 4];

export const CYCLE_PHASES = [
  { days: "1–5", name: "Menstrual", tokenClassName: "bg-cycle-menstrual" },
  { days: "6–13", name: "Follicular", tokenClassName: "bg-cycle-follicular/30" },
  { active: true, days: "14–16", name: "Ovulatory", tokenClassName: "bg-cycle-ovulatory/40" },
  { days: "17–28", name: "Luteal", tokenClassName: "bg-cycle-luteal/30" },
];
