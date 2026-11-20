export const OVERLAY_REDUCED_ZOOM = "motion-reduce:data-[state=closed]:zoom-out-100 motion-reduce:data-[state=open]:zoom-in-100";

export const OVERLAY_REDUCED_SLIDE =
  "motion-reduce:data-[side=bottom]:slide-in-from-top-0 motion-reduce:data-[side=left]:slide-in-from-right-0 motion-reduce:data-[side=right]:slide-in-from-left-0 motion-reduce:data-[side=top]:slide-in-from-bottom-0";

export const OVERLAY_REDUCED_MOTION = `${OVERLAY_REDUCED_ZOOM} ${OVERLAY_REDUCED_SLIDE}`;
