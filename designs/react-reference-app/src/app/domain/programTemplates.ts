import type { ProgramLanguage } from './program';

export type TemplateKey =
  | 'legend'
  | 'warmUp'
  | 'coolDown'
  | 'progression'
  | 'steps'
  | 'missedDay'
  | 'calibration'
  | 'block.foundation'
  | 'block.hypertrophy'
  | 'block.strength'
  | 'block.deload'
  | 'split.full-body'
  | 'split.upper-lower'
  | 'lowEnergy'
  | 'noWeight';

export const GUIDE_TEXT_KEYS = ['legend', 'warmUp', 'progression', 'coolDown', 'noWeight', 'lowEnergy', 'calibration', 'steps'] as const;
export type GuideTextKey = (typeof GUIDE_TEXT_KEYS)[number];
export type GuideTexts = Partial<Record<GuideTextKey, string>>;

export type TemplateText = { text: string; pending: boolean };

const TEMPLATES: Record<ProgramLanguage, Partial<Record<TemplateKey, string>>> = {
  en: {
    'block.foundation': `**Building your base**
These first weeks are about learning to move well, not about lifting heavy. We'll focus on technique in the key movements (squat, hinge, push, pull), getting your body used to regular training, and giving your joints and tendons time to adapt.
**How it should feel:** challenging but controlled. You should finish every set feeling you could do 3–4 more reps with good form. Some muscle soreness in the first week is normal and will fade.
**Your focus:** quality over weight. Film a set now and then and send it to me, or check the video cues, and move slowly and deliberately.`,
    'block.hypertrophy': `**Building muscle**
In this phase, the goal is to build muscle and shape. This is what creates a toned, strong look and supports a healthy metabolism.
**How it should feel:** challenging. Most sets should end 1–2 reps short of failure. Your muscles should feel worked, with a noticeable "burn" on the higher-rep exercises.
**Your focus:** progressive overload. Each week, aim to add a rep or a little weight. Write your numbers in the tracking table: that's how I know you're progressing.`,
    'block.strength': `**Getting stronger**
In this block we lower the reps and raise the weights on your main lifts. Getting stronger makes everyday life easier, protects your joints and bones, and lets you use heavier weights later, which helps you build even more muscle.
**How it should feel:** heavy but technically clean. Rest longer between sets so each one is high quality. You won't feel the "burn" as much, and that's expected.
**Your focus:** proper form under heavier load. If a rep starts to break down, stop the set.`,
    'block.deload': `**Recovery on purpose**
This week is intentionally lighter. Training hard builds fatigue over time, and a planned easier week lets your body recover, so you come back stronger. This is part of the plan, not a step back.
**How it should feel:** easy. Same exercises, fewer sets and lighter weights. You should leave every session feeling fresh.
**Your focus:** move well, sleep well, and enjoy the lighter week.`,
    'calibration': `**Week 1 — finding your weights.** This week is about getting to know the exercises and finding the right weight for each one. Stop every set when you feel you could do about 2-3 more reps. From week 2, we'll push a bit harder.`,
    'split.full-body': `**Your split: Full Body, [2–3]x per week**
Every session trains your whole body: legs, glutes, back, chest and core. This means each muscle gets worked several times a week, which is ideal for learning the movements and making steady progress, even with a busy schedule.`,
    'split.upper-lower': `**Your split: Upper / Lower, 4x per week**
We alternate between lower body days (legs and glutes) and upper body days (back, chest, shoulders, arms). Splitting the body this way lets each session go deeper with more exercises per muscle, while every muscle is still trained twice a week.`,
    'warmUp': `**Warm-up**
3–5 min of light cardio until you feel warm, then the warm-up on your session page.`,
    'coolDown': `**Cool-down (optional, 5 min):** Easy walking and a few stretches for the muscles you trained. Hold each stretch 20–30 seconds and breathe slowly.`,
    'legend': `**How to read your session**
**Reps 8–10** — Pick a weight that lets you reach this range with good form.
**RIR 2** — Reps in reserve: stop each set when you could do about 2 more. RIR 0 means to failure, with good form.`,
    'progression': `**How to progress:** When you hit the top of the rep range on all sets with the target RIR, increase the weight next session (lower body +2.5–5 kg, upper body +1–2.5 kg, or the next dumbbell). If you can't reach the bottom of the range, keep the weight and build up again.`,
    'steps': `**Daily steps**
Walking is one of the most underrated tools for health and fat loss. Spread your steps through the day: a short walk after meals counts.`,
    'missedDay': `**If you miss a session:** Just continue with the next one in the order. Don't try to double up.`,
    'lowEnergy': `Low-energy session (20–30 min): mobility, an easy walk or light exercises. It still counts.`,
    'noWeight': `No weight listed? Pick one that lets you finish the set at the RIR shown.`,
  },
  ro: {},
};

const PLACEHOLDER_VALUE_KEYS: Record<string, string> = {
  '2–3': 'days',
};

export function isGuideTextKey(key: TemplateKey): key is GuideTextKey {
  return (GUIDE_TEXT_KEYS as readonly string[]).includes(key);
}

export function guideText(guideTexts: GuideTexts | undefined, key: GuideTextKey, language: ProgramLanguage): string {
  return guideTexts?.[key] ?? templateText(key, language).text;
}

export function withGuideText(guideTexts: GuideTexts | undefined, key: GuideTextKey, text: string): GuideTexts {
  return { ...guideTexts, [key]: text };
}

export function withoutGuideText(guideTexts: GuideTexts | undefined, key: GuideTextKey): GuideTexts {
  return Object.fromEntries(Object.entries(guideTexts ?? {}).filter(([other]) => other !== key));
}

export function templateText(key: TemplateKey, language: ProgramLanguage): TemplateText {
  const own = TEMPLATES[language][key];
  if (own !== undefined) return { text: own, pending: false };
  return { text: TEMPLATES.en[key] ?? '', pending: language !== 'en' };
}

export function fillTemplate(text: string, values: Record<string, string | number>): string {
  return text.replace(/\[([^\]]+)\]/g, (placeholder, name: string) => {
    const valueKey = PLACEHOLDER_VALUE_KEYS[name] ?? name;
    const value = values[valueKey];
    return value === undefined ? placeholder : String(value);
  });
}
