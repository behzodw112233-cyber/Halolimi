import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';

/**
 * Upload a local file to a Convex storage upload URL and return its storage id.
 *
 * We stream the file straight from disk (BINARY_CONTENT) instead of the
 * `fetch(uri).blob()` trick — on Android RN that blob often uploads empty, which
 * is why images silently vanished from listings. Returns null on any failure.
 */
export async function uploadToConvex(
  uploadUrl: string,
  fileUri: string,
  contentType = 'image/jpeg'
): Promise<string | null> {
  try {
    const res = await uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': contentType },
    });
    if (res.status < 200 || res.status >= 300) return null;
    const { storageId } = JSON.parse(res.body) as { storageId?: string };
    return storageId ?? null;
  } catch {
    return null;
  }
}
