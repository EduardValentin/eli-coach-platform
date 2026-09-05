type ClearFiltersButtonProps = {
  onClear: () => void;
};

/** The way out of a narrowed library, offered beside the filters and inside the table when nothing matches. */
export function ClearFiltersButton(props: ClearFiltersButtonProps) {
  return (
    <button
      className="-mx-2 w-fit min-h-6 px-2 text-caption font-semibold text-brand-primary hover:text-brand-primary-hover"
      onClick={props.onClear}
      type="button"
    >
      Clear search and filters
    </button>
  );
}
