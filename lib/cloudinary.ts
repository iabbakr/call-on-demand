export const CLOUDINARY_UPLOAD_PRESET = "your_unsigned_preset";
export const CLOUDINARY_CLOUD_NAME = "your_cloud_name";
export const CLOUDINARY_API_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;




export const uploadImageToCloudinary = async (imageUri: string) => {
  const data = new FormData();
  data.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "upload.jpg",
  } as any);
  data.append("upload_preset", "YOUR_UPLOAD_PRESET");
  data.append("cloud_name", "YOUR_CLOUD_NAME");

  const res = await fetch("https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload", {
    method: "POST",
    body: data,
  });

  const json = await res.json();
  return json.secure_url;
};
