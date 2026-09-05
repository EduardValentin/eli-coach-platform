type ClearFiltersButtonProps = {
  /** Present but inert when there is nothing to clear, so focus is never dropped. */
  enabled?: boolean;
  onClear: () => void;
};

/**
 * The way out of a narrowed library, offered both beside the filters and inside
 * the table when nothing matches.
 *
 * `aria-disabled` rather than `disabled`: a browser blurs a control the moment
 * it is disabled, which would throw keyboard focus to the body.
 */
export function ClearFiltersButton(props: ClearFiltersButtonProps) {
  const { enabled = true, onClear } = props;

  return (
    <button
      aria-disabled={!enabled}
      className="-mx-2 w-fit min-h-6 px-2 text-label font-semibold normal-case tracking-normal text-brand-primary hover:text-brand-primary-hover aria-disabled:text-text-muted aria-disabled:hover:text-text-muted"
      onClick={() => {
        if (enabled) {
          onClear();
        }
      }}
      type="button"
    >
      Clear search and filters
    </button>
  );
}
