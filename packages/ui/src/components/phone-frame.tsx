import * as React from "react";

import { cn } from "../lib/cn";

export type PhoneFrameProps = React.ComponentPropsWithoutRef<"div"> & {
  statusBarVariant?: "dark" | "light";
  time?: string;
};

export const PhoneFrame = React.forwardRef<HTMLDivElement, PhoneFrameProps>(
  ({ children, className, statusBarVariant = "dark", time = "9:41", ...props }, ref) => {
    const statusVariantClassName =
      statusBarVariant === "light"
        ? "ui-phone-frame__status-bar-light"
        : "ui-phone-frame__status-bar-dark";

    return (
      <div ref={ref} className={cn("ui-phone-frame", className)} {...props}>
        {children}
        <div aria-hidden="true" className="ui-phone-frame__notch" />
        <div
          aria-hidden="true"
          className={cn("ui-phone-frame__status-bar", statusVariantClassName)}
        >
          <span>{time}</span>
          <span className="ui-phone-frame__status-dots">
            <span className="ui-phone-frame__status-dot" />
            <span className="ui-phone-frame__status-dot" />
            <span className="ui-phone-frame__status-dot" />
          </span>
        </div>
      </div>
    );
  },
);

PhoneFrame.displayName = "PhoneFrame";
