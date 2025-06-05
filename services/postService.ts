// File: src/services/postService.ts
import { Post, PostFormData } from "@/types/next-auth";
/**
 * Service to handle post-related API calls
 */
export async function fetchPosts(locationId: string): Promise<Post[]> {
  try {
    const response = await fetch(`/api/posts?locationId=${locationId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch posts");
    }
    return await response.json();
  } catch (error) {
    console.error("Error in fetchPosts:", error);
    throw error;
  }
}

export async function createPost(postData: PostFormData): Promise<Post> {
  try {
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });
    console.log("response", response);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create post");
    }
    return await response.json();
  } catch (error) {
    console.error("Error in createPost:", error);
    throw error;
  }
}

export async function updatePost(
  postId: string,
  postData: Partial<PostFormData>
): Promise<Post> {
  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update post");
    }
    return await response.json();
  } catch (error) {
    console.error("Error in updatePost:", error);
    throw error;
  }
}

export async function deletePost(postId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete post");
    }
    return true;
  } catch (error) {
    console.error("Error in deletePost:", error);
    throw error;
  }
}
