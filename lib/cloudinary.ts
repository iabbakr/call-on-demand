export const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
export const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!;
export const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const uploadImageToCloudinary = async (imageUri: string) => {
  const response = await fetch(imageUri);
  const blob = await response.blob();

  const data = new FormData();
  data.append("file", blob as any);
  data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_API_URL, {
    method: "POST",
    body: data,
  });

  const json = await res.json();
  if (!json.secure_url) throw new Error("Upload failed");
  return json.secure_url;
};

