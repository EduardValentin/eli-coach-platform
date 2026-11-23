import type { ProgramLanguage } from "./vocabulary";

export type TemplateKey =
  | "missedDay"
  | "block.foundation"
  | "block.hypertrophy"
  | "block.strength"
  | "block.deload"
  | "split.full-body"
  | "split.upper-lower";

const TEMPLATES: Record<
  ProgramLanguage,
  Partial<Record<TemplateKey, string>>
> = {
  en: {
    "block.foundation": `**Building your base**
These first weeks are about learning to move well, not about lifting heavy. We'll focus on technique in the key movements (squat, hinge, push, pull), getting your body used to regular training, and giving your joints and tendons time to adapt.
**How it should feel:** challenging but controlled. You should finish every set feeling you could do 3–4 more reps with good form. Some muscle soreness in the first week is normal and will fade.
**Your focus:** quality over weight. Film a set now and then and send it to me, or check the video cues, and move slowly and deliberately.`,
    "block.hypertrophy": `**Building muscle**
In this phase, the goal is to build muscle and shape. This is what creates a toned, strong look and supports a healthy metabolism.
**How it should feel:** challenging. In the first week, most sets end 2–3 reps short of failure; after that, the RIR on each week's sessions tells you how close to go. Your muscles should feel worked, with a noticeable "burn" on the higher-rep exercises.
**Your focus:** progressive overload. Each week's reps, RIR and weights are written in your program, so a little more each week is already planned. Write your numbers in the tracking table: that's how I know you're progressing.`,
    "block.strength": `**Getting stronger**
In this block we lower the reps and raise the weights on your main lifts. Getting stronger makes everyday life easier, protects your joints and bones, and lets you use heavier weights later, which helps you build even more muscle.
**How it should feel:** heavy but technically clean. Rest longer between sets so each one is high quality. You won't feel the "burn" as much, and that's expected.
**Your focus:** proper form under heavier load. If a rep starts to break down, stop the set.`,
    "block.deload": `**Recovery on purpose**
This week is intentionally lighter. Training hard builds fatigue over time, and a planned easier week lets your body recover, so you come back stronger. This is part of the plan, not a step back.
**How it should feel:** easy. Same exercises, fewer sets and lighter weights. You should leave every session feeling fresh.
**Your focus:** move well, sleep well, and enjoy the lighter week.`,
    "split.full-body": `**Your split: Full Body, [2–3]x per week**
Every session trains your whole body: legs, glutes, back, chest and core. This means each muscle gets worked several times a week, which is ideal for learning the movements and making steady progress, even with a busy schedule.`,
    "split.upper-lower": `**Your split: Upper / Lower, 4x per week**
We alternate between lower body days (legs and glutes) and upper body days (back, chest, shoulders, arms). Splitting the body this way lets each session go deeper with more exercises per muscle, while every muscle is still trained twice a week.`,
    missedDay: `**If you miss a session:** Just continue with the next one in the order. Don't try to double up.`,
  },
  ro: {},
};

const PLACEHOLDER_VALUE_KEYS: Record<string, string> = {
  "2–3": "days",
};

export function templateText(
  key: TemplateKey,
  language: ProgramLanguage,
): string {
  return TEMPLATES[language][key] ?? TEMPLATES.en[key] ?? "";
}

export function fillTemplate(
  text: string,
  values: Record<string, string | number>,
): string {
  return text.replace(/\[([^\]]+)\]/g, (placeholder, name: string) => {
    const valueKey = PLACEHOLDER_VALUE_KEYS[name] ?? name;
    const value = values[valueKey];

    return value === undefined ? placeholder : String(value);
  });
}
