// app/api/gmb-sync/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchAndStoreGMBLocations } from "@/services/gmbService";

export async function POST() {
  try {
    // Get the session from the server
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized - No access token" },
        { status: 401 }
      );
    }

    // Start the sync process
    console.log("Starting GMB location sync via API route...");

    const result = await fetchAndStoreGMBLocations({
      ...session,
      accessToken: session.accessToken,
    });

    return NextResponse.json({
      success: true,
      message: "GMB locations synced successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in GMB sync API route:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        error: "Failed to sync GMB locations",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Export config to increase the function timeout for Vercel
export const config = {
  maxDuration: 60, // Maximum execution time in seconds (for Vercel Pro)
};
