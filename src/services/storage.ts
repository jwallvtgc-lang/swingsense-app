import { uploadAsync, getInfoAsync, FileSystemUploadType } from 'expo-file-system/legacy';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/supabase';

export async function uploadSwingVideo(
  userId: string,
  videoUri: string,
  analysisId: string
): Promise<{ url: string; error: Error | null }> {
  try {
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
      return { url: '', error: new Error(`Upload failed (${uploadResult.status}): ${uploadResult.body}`) };
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from('swing-videos')
      .createSignedUrl(storagePath, 3600);

    if (signError || !signedData?.signedUrl) {
      return { url: '', error: new Error(`Failed to create signed URL: ${signError?.message}`) };
    }

    return { url: signedData.signedUrl, error: null };
  } catch (err) {
    return { url: '', error: err as Error };
  }
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
