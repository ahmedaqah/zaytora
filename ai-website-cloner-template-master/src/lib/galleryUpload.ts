import { compressImage, fileToDataUrl } from "@/lib/imageCompress";
import { uploadGalleryImage } from "@/lib/services/invitations.service";

// Shrinks a picked photo and uploads it, returning the URL to store. If the
// upload isn't possible (offline, no invitation id yet, server error) it falls
// back to the *compressed* data URL, so adding a photo never just fails.
export async function prepareGalleryImage(invitationId: string | undefined, file: File): Promise<string> {
  const compressed = await compressImage(file);
  if (invitationId) {
    try {
      return await uploadGalleryImage(invitationId, compressed);
    } catch (error) {
      console.error("[gallery] upload failed, keeping inline copy:", error);
    }
  }
  return fileToDataUrl(compressed);
}
