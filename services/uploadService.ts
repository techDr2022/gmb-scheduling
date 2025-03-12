import { UploadResponse } from "@/types/next-auth";

/**
 * Service to handle file uploads
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to upload image");
    }

    return await response.json();
  } catch (error) {
    console.error("Error in uploadImage:", error);
    throw error;
  }
}
