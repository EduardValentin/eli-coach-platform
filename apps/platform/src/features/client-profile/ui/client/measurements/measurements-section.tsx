import { measureUnitsOf } from "@eli-coach-platform/domain/unit-preference";
import { Button } from "@eli-coach-platform/ui/primitives";
import { Plus } from "lucide-react";
import { useState } from "react";

import {
  MEASUREMENTS_COPY,
  type MeasurementsPage,
} from "~/features/client-profile/contracts/measurements";
import { AddMeasurementsSheet } from "~/features/client-profile/ui/client/measurements/add-measurements-sheet";
import { useProgressPhotoRemoval } from "~/features/client-profile/ui/client/measurements/use-progress-photo-removal";
import { MeasurementsTable } from "~/features/client-profile/ui/shared/measurements/measurements-table";
import { PhotoViewDialog } from "~/features/client-profile/ui/shared/photos/photo-view-dialog";

const CLIENT_COPY = MEASUREMENTS_COPY.client;

export function MeasurementsSection({ page }: { page: MeasurementsPage }) {
  const removeProgressPhoto = useProgressPhotoRemoval();
  const units = measureUnitsOf(page.units);
  const [adding, setAdding] = useState(false);
  const [viewingEntryId, setViewingEntryId] = useState<string | null>(null);
  const [latest] = page.history;
  const viewedEntry = page.history.find((entry) => entry.id === viewingEntryId);

  return (
    <MeasurementsTable
      action={
        <Button onClick={() => setAdding(true)} size="sm" variant="outline">
          <Plus aria-hidden="true" size={16} />
          {CLIENT_COPY.add}
        </Button>
      }
      className="mt-6 lg:mt-8"
      emptyAction={
        <Button onClick={() => setAdding(true)} size="sm" variant="primary">
          {CLIENT_COPY.addFirst}
        </Button>
      }
      emptyMessage={CLIENT_COPY.empty}
      headingId="measurements-heading"
      measurements={page.history}
      onViewPhotos={(entry) => setViewingEntryId(entry.id)}
      perspective="client"
      units={units}
    >
      <AddMeasurementsSheet
        consentedAt={page.consentedAt}
        latest={latest}
        onOpenChange={setAdding}
        open={adding}
        units={units}
      />

      <PhotoViewDialog
        onClose={() => setViewingEntryId(null)}
        entry={viewedEntry}
        viewer={{
          role: "client",
          onRemovePhoto: (photo) => removeProgressPhoto(photo.id),
        }}
      />
    </MeasurementsTable>
  );
}
