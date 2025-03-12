import { Location } from "@/types/next-auth";

/**
 * Service to handle location-related API calls
 */
export async function fetchLocations(): Promise<Location[]> {
  try {
    const response = await fetch("/api/locations");
    if (!response.ok) {
      throw new Error("Failed to fetch locations");
    }
    return await response.json();
  } catch (error) {
    console.error("Error in fetchLocations:", error);
    throw error;
  }
}
