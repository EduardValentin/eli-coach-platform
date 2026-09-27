import { cn } from "@eli-coach-platform/ui/lib";
import { createFadeUpVariants } from "@eli-coach-platform/ui/motion";
import { cardVariants } from "@eli-coach-platform/ui/primitives";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

import { COACHING_BUNDLE_BENEFITS } from "./benefits";

export function BundleBenefits() {
  return (
    <motion.section
      animate="visible"
      className={cn(cardVariants(), "mb-10 p-8 md:p-10")}
      initial="hidden"
      variants={createFadeUpVariants({
        delay: 0.3,
        duration: 0.52,
        offset: 15,
      })}
    >
      <h4 className="ui-public-bundle-benefits-heading ui-public-bundle-muted mb-6 text-center text-sm font-semibold uppercase leading-5">
        What&apos;s included in every plan
      </h4>
      <ul className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {COACHING_BUNDLE_BENEFITS.map((benefit) => (
          <li className="flex items-start gap-3" key={benefit}>
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-brand-primary"
              size={18}
            />
            <span className="text-sm leading-5 text-link-muted">{benefit}</span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
