import { uploadAsync, getInfoAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

async function attemptUpload(
  userId: string,
  videoUri: string,
  analysisId: string
): Promise<{ url: string; error: Error | null }> {
  const extension = videoUri.split('.').pop()?.toLowerCase() ?? 'mp4';
  const storagePath = `${userId}/${analysisId}.${extension}`;

  const fileInfo = await getInfoAsync(videoUri);
  if (!fileInfo.exists) {
    return { url: '', error: new Error('Video file not found') };
  }

  const contentType = extension === 'mov' ? 'video/quicktime' : 'video/mp4';

  const session = (await supabase.auth.getSession()).data.session;
  if (!session) {
    return { url: '', error: new Error('Not authenticated — no session') };
  }

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/swing-videos/${storagePath}`;

  const uploadResult = await uploadAsync(uploadUrl, videoUri, {
    httpMethod: 'POST',
    uploadType: FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': contentType,
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    return { url: '', error: new Error('Upload failed — check your connection and try again.') };
  }

  const { data: signedData, error: signError } = await supabase.storage
    .from('swing-videos')
    .createSignedUrl(storagePath, 3600);

  if (signError || !signedData?.signedUrl) {
    const isNetworkError =
      signError?.message?.toLowerCase().includes('network') ||
      signError?.message?.toLowerCase().includes('failed to fetch');
    const friendlyMessage = isNetworkError
      ? 'Upload failed — check your connection and try again.'
      : `Failed to create signed URL: ${signError?.message}`;
    return { url: '', error: new Error(friendlyMessage) };
  }

  return { url: signedData.signedUrl, error: null };
}

export async function uploadSwingVideo(
  userId: string,
  videoUri: string,
  analysisId: string,
  onStatusChange?: (message: string) => void
): Promise<{ url: string; error: Error | null }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt === 1) {
        onStatusChange?.('Uploading your swing');
      } else {
        onStatusChange?.('Retrying upload...');
      }

      const result = await attemptUpload(userId, videoUri, analysisId);

      if (result.error === null) {
        return result; // Success
      }

      // If this was the last attempt, return the error
      if (attempt === MAX_RETRIES) {
        return result;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    } catch (err) {
      // If this was the last attempt, return the error
      if (attempt === MAX_RETRIES) {
        return { url: '', error: new Error('Upload failed — check your connection and try again.') };
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  // This should never be reached, but just in case
  return { url: '', error: new Error('Upload failed — check your connection and try again.') };
}

export async function getSignedVideoUrl(
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('swing-videos')
    .createSignedUrl(storagePath, 3600);

  if (error) return null;
  return data.signedUrl;
}
