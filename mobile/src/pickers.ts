import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { UploadAsset } from "./api";

/**
 * Photo library and document pickers, normalised to the shape `api.upload`
 * wants.
 *
 * Both return `null` when the person backs out, which callers treat as "nothing
 * happened" — cancelling a picker is not an error and must never raise a toast.
 */

export async function pickImages(multiple = false): Promise<UploadAsset[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Geen toegang tot je fotobibliotheek. Zet dit aan in Instellingen.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: multiple,
    // Full quality would push 8–12MB per frame over 4G; 0.85 is visually
    // indistinguishable in a gallery and uploads in a fraction of the time.
    quality: 0.85,
    exif: false,
  });

  if (result.canceled) return null;

  return result.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName || `foto-${Date.now()}-${i}.jpg`,
    type: a.mimeType || "image/jpeg",
  }));
}

/** Same as pickImages but allows video, for portfolio covers. */
export async function pickMedia(): Promise<UploadAsset[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Geen toegang tot je fotobibliotheek. Zet dit aan in Instellingen.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    quality: 0.85,
    exif: false,
  });

  if (result.canceled) return null;

  return result.assets.map((a, i) => ({
    uri: a.uri,
    name: a.fileName || `media-${Date.now()}-${i}`,
    type: a.mimeType || (a.type === "video" ? "video/mp4" : "image/jpeg"),
  }));
}

/** Receipts: a photo of a till slip, or a PDF invoice from email. */
export async function pickReceipt(): Promise<UploadAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || `bon-${Date.now()}`,
    type: asset.mimeType || "application/octet-stream",
  };
}

/** Takes a photo with the camera instead of choosing an existing one. */
export async function captureImage(): Promise<UploadAsset | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Geen toegang tot de camera. Zet dit aan in Instellingen.");
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.85, exif: false });
  if (result.canceled) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName || `foto-${Date.now()}.jpg`,
    type: asset.mimeType || "image/jpeg",
  };
}
