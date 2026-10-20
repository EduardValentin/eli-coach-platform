import type { ProgramLanguage } from './program';

export type TemplateKey =
  | 'legend'
  | 'warmUp'
  | 'coolDown'
  | 'progression'
  | 'steps'
  | 'cycle'
  | 'hiitAside'
  | 'missedDay'
  | 'calibration'
  | 'block.foundation'
  | 'block.hypertrophy'
  | 'block.strength'
  | 'block.deload'
  | 'split.full-body'
  | 'split.upper-lower'
  | 'split.lower-focus'
  | 'lowEnergy';

export type TemplateText = { text: string; pending: boolean };

const TEMPLATES: Record<ProgramLanguage, Partial<Record<TemplateKey, string>>> = {
  en: {
    'block.foundation': `**Foundation block — building your base (suggested for beginners, week 1-2)**
These first weeks are about learning to move well, not about lifting heavy. We'll focus on technique in the key movements (squat, hinge, push, pull), getting your body used to regular training, and giving your joints and tendons time to adapt.
**How it should feel:** challenging but controlled. You should finish every set feeling you could do 3–4 more reps with good form. Some muscle soreness in the first week is normal and will fade.
**Your focus:** quality over weight. Film a set now and then and send it to me, or check the video cues, and move slowly and deliberately.`,
    'block.hypertrophy': `**Hypertrophy block — building muscle**
In this phase, the goal is to build muscle and shape. This is what creates a toned, strong look and supports a healthy metabolism.
**How it should feel:** challenging. Most sets should end 1–2 reps short of failure. Your muscles should feel worked, with a noticeable "burn" on the higher-rep exercises.
**Your focus:** progressive overload. Each week, aim to add a rep or a little weight. Write your numbers in the tracking table: that's how I know you're progressing.`,
    'block.strength': `**Strength block — getting stronger**
In this block we lower the reps and raise the weights on your main lifts. Getting stronger makes everyday life easier, protects your joints and bones, and lets you use heavier weights later, which helps you build even more muscle.
**How it should feel:** heavy but technically clean. Rest longer between sets so each one is high quality. You won't feel the "burn" as much, and that's expected.
**Your focus:** proper form under heavier load. If a rep starts to break down, stop the set.`,
    'block.deload': `**Deload week — recovery on purpose**
This week is intentionally lighter. Training hard builds fatigue over time, and a planned easier week lets your body recover, so you come back stronger. This is part of the plan, not a step back.
**How it should feel:** easy. Same exercises, fewer sets and lighter weights. You should leave every session feeling fresh.
**Your focus:** move well, sleep well, and enjoy the lighter week.`,
    'calibration': `**Week 1 — finding your weights.** This week is about getting to know the exercises and finding the right weight for each one. Stop every set when you feel you could do about 2-3 more reps. From week 2, we'll push a bit harder.`,
    'split.full-body': `**Your split: Full Body, [2–3]x per week**
Every session trains your whole body: legs, glutes, back, chest and core. This means each muscle gets worked several times a week, which is ideal for learning the movements and making steady progress, even with a busy schedule.
**Tip:** leave at least one rest day between sessions.`,
    'split.upper-lower': `**Your split: Upper / Lower, 4x per week**
We alternate between lower body days (legs and glutes) and upper body days (back, chest, shoulders, arms). Splitting the body this way lets each session go deeper with more exercises per muscle, while every muscle is still trained twice a week.`,
    'split.lower-focus': `**Your split: Lower-focus, [3–5]x per week**
Your program puts extra emphasis on glutes and legs, with dedicated upper body work to keep you balanced and strong overall. Glutes recover quickly, so they can be trained often and from different angles.`,
    'warmUp': `**Warm-up (5–10 min)**
1. 3–5 min light cardio (brisk walk, bike, jumping jacks) until you feel warm.
2. Mobility for today's movements (listed below).
3. Warm-up sets on your first exercise: build up gradually to your working weight. These don't count as working sets.`,
    'coolDown': `**Cool-down (optional, 5 min):** easy walking and a few stretches for the muscles you trained. Hold each stretch 20–30 seconds and breathe slowly.`,
    'legend': `**How to read your session**
**A, B, C** — do the exercises in this order.
**C1 / C2** — superset: do one set of C1, then one set of C2, then rest. Repeat for all sets.
**Reps 8–10** — pick a weight that lets you reach this range with good form.
**RIR 2** — stop each set when you feel you could do about 2 more reps.
**RIR 0 — to failure:** keep going until you can't do another rep with good form. Stop there, don't swing or cheat the last rep.
**Pause** — hold the position for 1–2 seconds at the hardest point of the rep.
**Rest** — time between sets (or between rounds in a superset).`,
    'progression': `**How to progress:** when you hit the top of the rep range on all sets with the target RIR, increase the weight next session (lower body +2.5–5 kg, upper body +1–2.5 kg, or the next dumbbell). If you can't reach the bottom of the range, keep the weight and build up again.`,
    'steps': `**Daily steps: [8,000]**
Walking is one of the most underrated tools for health and fat loss. Spread your steps through the day: a short walk after meals counts.`,
    'cycle': `**Listening to your cycle**
Your program is built around how *you* feel, not a textbook calendar. On days when symptoms like cramps, fatigue or headaches hit, you have options:
— keep the session but stop each set 1 rep earlier than usual, or
— do one set less per exercise, or
— swap it for your **Low-energy session** below.
None of these are "skipping". Log how you felt in your check-in so we can learn your pattern and plan ahead for next cycle.`,
    'hiitAside': `Low energy or cramps today? Swap this for a 30-minute easy walk. It still counts.`,
    'missedDay': `If you miss a session, just continue with the next one in the order. Don't try to double up.`,
    'lowEnergy': `Low-energy session (20–30 min): mobility, an easy walk or light exercises. It still counts.`,
  },
  ro: {},
};

const PLACEHOLDER_VALUE_KEYS: Record<string, string> = {
  '8,000': 'steps',
  '2–3': 'days',
  '3–5': 'days',
};

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
