declare module "canvas-confetti" {
  export type Options = {
    colors?: string[];
    disableForReducedMotion?: boolean;
    origin?: {
      x?: number;
      y?: number;
    };
    particleCount?: number;
    spread?: number;
  };

  export default function confetti(options?: Options): Promise<null> | null;
}
