import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload a file to Cloudinary
export const cloudinaryUpload = async (localfilepath) => {
  try {
    if (!localfilepath) return null;
    const response = await cloudinary.uploader.upload(localfilepath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localfilepath);
    return response;
  } catch (error) {
    console.log(error.message);
    fs.unlinkSync(localfilepath);
  }
};

// Function to delete a file from Cloudinary
export const cloudinaryDestroy = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });

    return response;
  } catch (error) {
    console.log(error.message);
    return null;
  }
};
