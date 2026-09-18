import type { LucideIcon } from "lucide-react";
import { Droplet, Dumbbell, MessageCircle, Utensils } from "lucide-react";

export type CapabilityId = "workouts" | "nutrition" | "chat" | "cycle";

export type Capability = {
  desktopPositionClassName: string;
  icon: LucideIcon;
  id: CapabilityId;
  label: string;
};

export const CAPABILITIES: Capability[] = [
  {
    id: "workouts",
    label: "Personalized workouts",
    icon: Dumbbell,
    desktopPositionClassName: "top-4 right-full mr-3 xl:mr-5",
  },
  {
    id: "nutrition",
    label: "Nutrition planner",
    icon: Utensils,
    desktopPositionClassName: "top-24 left-full ml-3 xl:ml-5",
  },
  {
    id: "chat",
    label: "Chat with your coach",
    icon: MessageCircle,
    desktopPositionClassName: "bottom-28 right-full mr-3 xl:mr-5",
  },
  {
    id: "cycle",
    label: "Cycle tracking",
    icon: Droplet,
    desktopPositionClassName: "bottom-8 left-full ml-3 xl:ml-5",
  },
];

export const WORKOUT_EXERCISES = [
  { detail: "4 sets · 8 reps", name: "Goblet Squat", number: "01" },
  { detail: "3 sets · 10 reps", name: "Romanian Deadlift", number: "02" },
  { detail: "4 sets · 12 reps", name: "Hip Thrust", number: "03" },
];

export const MACRO_SPLIT = [
  { label: "Protein 35%", widthClassName: "w-[35%] bg-brand-primary" },
  { label: "Carbs 40%", widthClassName: "w-[40%] bg-brand-primary/60" },
  { label: "Fat 25%", widthClassName: "w-[25%] bg-brand-primary/30" },
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
  {
    days: "6–13",
    name: "Follicular",
    tokenClassName: "bg-cycle-follicular/30",
  },
  {
    active: true,
    days: "14–16",
    name: "Ovulatory",
    tokenClassName: "bg-cycle-ovulatory/40",
  },
  { days: "17–28", name: "Luteal", tokenClassName: "bg-cycle-luteal/30" },
];
