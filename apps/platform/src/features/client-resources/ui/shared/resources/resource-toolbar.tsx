import { useIsMobileViewport } from "@eli-coach-platform/ui/lib";
import {
  SearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@eli-coach-platform/ui/primitives";
import type { ReactNode } from "react";

import type { ResourceTagOptionView } from "~/features/client-resources/public/client-resources";
import type { ResourceBrowseView } from "~/features/client-resources/public/resource-browse";

import { RESOURCE_TOOLBAR_COPY } from "./resource-copy";

const ALL_TAGS = "__all__";

export type ResourceToolbarControlSize = "sm" | "md";

type TagFilterProps = {
  chosen: string | null;
  options: readonly ResourceTagOptionView[];
  searched: number;
  onChoose: (tag: string | null) => void;
  size: ResourceToolbarControlSize;
};

function TagFilter({
  chosen,
  options,
  searched,
  onChoose,
  size,
}: TagFilterProps) {
  return (
    <Select
      onValueChange={(value) => onChoose(value === ALL_TAGS ? null : value)}
      value={chosen ?? ALL_TAGS}
    >
      <SelectTrigger
        aria-label={RESOURCE_TOOLBAR_COPY.tag}
        className="w-full md:w-56"
        size={size}
      >
        <SelectValue>{chosen ?? RESOURCE_TOOLBAR_COPY.allTags}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem count={searched} value={ALL_TAGS}>
          {RESOURCE_TOOLBAR_COPY.allTags}
        </SelectItem>
        {options.map(({ tag, count }) => (
          <SelectItem count={count} key={tag} value={tag}>
            {tag}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type ResourceToolbarProps = {
  browse: ResourceBrowseView;
  tagOptions: readonly ResourceTagOptionView[];
  searched: number;
  typedSearch: string;
  onChooseTag: (tag: string | null) => void;
  onSearch: (search: string) => void;
  sort?: (size: ResourceToolbarControlSize) => ReactNode;
};

export function ResourceToolbar({
  browse,
  tagOptions,
  searched,
  typedSearch,
  onChooseTag,
  onSearch,
  sort,
}: ResourceToolbarProps) {
  const size = useIsMobileViewport() ? "md" : "sm";

  return (
    <div
      className="mb-6 grid grid-cols-2 gap-3 md:flex md:items-center"
      data-parity="resource-toolbar"
    >
      <div className="min-w-0 md:mr-auto">
        <TagFilter
          chosen={browse.tag}
          onChoose={onChooseTag}
          options={tagOptions}
          searched={searched}
          size={size}
        />
      </div>
      <SearchField
        aria-label={RESOURCE_TOOLBAR_COPY.search}
        className="min-w-0 md:w-64"
        onChange={(event) => onSearch(event.target.value)}
        placeholder={RESOURCE_TOOLBAR_COPY.searchPlaceholder}
        size={size}
        value={typedSearch}
      />
      {sort?.(size)}
    </div>
  );
}
