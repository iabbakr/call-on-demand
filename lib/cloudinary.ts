// lib/cloudinary.ts
export const CLOUDINARY_UPLOAD_PRESET =
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
export const CLOUDINARY_CLOUD_NAME =
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
export const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Upload an image to Cloudinary and return the secure URL.
 *
 * @param imageUri - Local image URI (from ImagePicker or file source)
 * @param folder - Optional folder name to organize uploads (e.g., "profiles", "foods")
 * @returns The secure Cloudinary image URL
 */
export const uploadImageToCloudinary = async (
  imageUri: string,
  folder?: string
): Promise<string> => {
  try {
    // Prepare FormData for Cloudinary
    const data = new FormData();

    // Append image in React Native-friendly format
    data.append("file", {
      uri: imageUri,
      type: "image/jpeg", // or "image/png" if applicable
      name: `upload_${Date.now()}.jpg`,
    } as any);

    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    if (folder) data.append("folder", folder);

    // Upload to Cloudinary
    const res = await fetch(CLOUDINARY_API_URL, {
      method: "POST",
      body: data,
    });

    const json = await res.json();

    if (!res.ok || !json.secure_url) {
      console.error("Cloudinary upload failed:", json);
      throw new Error(json.error?.message || "Image upload failed");
    }

    return json.secure_url as string;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
};
