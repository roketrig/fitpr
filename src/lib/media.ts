import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export type ImageSource = 'camera' | 'library';

// Returns a local file URI the caller can preview immediately and pass to
// uploadImage, or null if the user cancelled or permission was denied.
export async function pickImage(source: ImageSource): Promise<string | null> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

// Uploads a local file URI to a Supabase Storage bucket at the given path
// (overwriting anything already there) and returns that same path — the
// caller stores the path, not a URL, since private buckets need a fresh
// signed URL generated at display time rather than a fixed one saved once.
export async function uploadImage(bucket: string, path: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export function getPublicImageUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function getSignedImageUrl(
  bucket: string,
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) {
    console.warn('Supabase signed URL failed', error);
    return null;
  }
  return data.signedUrl;
}
