export const RESOURCE_UPLOAD_PARTS = {
  file: "file",
  title: "title",
  description: "description",
} as const;

type ReceivedResourceUpload = {
  details: { title: string; description: string };
  file: { originalName: string; bytes: Uint8Array };
};

export async function receivedResourceUploadOf(
  formData: FormData,
): Promise<ReceivedResourceUpload | null> {
  const file = formData.get(RESOURCE_UPLOAD_PARTS.file);

  if (!(file instanceof File)) {
    return null;
  }

  return {
    details: {
      title: textPartOf(formData, RESOURCE_UPLOAD_PARTS.title),
      description: textPartOf(formData, RESOURCE_UPLOAD_PARTS.description),
    },
    file: {
      originalName: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
    },
  };
}

function textPartOf(formData: FormData, name: string): string {
  const part = formData.get(name);

  return typeof part === "string" ? part : "";
}
