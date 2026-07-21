import { uploadAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

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
  contentType = 'image/jpeg',
  webFile?: Blob
): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      let blob = webFile;
      if (!blob) {
        const fileResponse = await fetch(fileUri);
        if (!fileResponse.ok) {
          console.warn('uploadToConvex: could not read web file', fileResponse.status);
          return null;
        }
        blob = await fileResponse.blob();
      }
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': contentType },
        body: blob,
      });
      if (!res.ok) {
        console.warn('uploadToConvex: web upload failed', res.status, await res.text().catch(() => ''));
        return null;
      }
      const { storageId } = (await res.json()) as { storageId?: string };
      return storageId ?? null;
    }

    const res = await uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': contentType },
    });
    if (res.status < 200 || res.status >= 300) {
      console.warn('uploadToConvex: native upload failed', res.status, res.body);
      return null;
    }
    const { storageId } = JSON.parse(res.body) as { storageId?: string };
    return storageId ?? null;
  } catch (error) {
    console.warn('uploadToConvex failed', error);
    return null;
  }
}
