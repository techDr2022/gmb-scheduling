import { PrismaClient } from "@prisma/client";
import cron from "node-cron";
import { NextResponse } from "next/server";

// Initialize Prisma
const prisma = new PrismaClient();

// Define ExtendedJWT type
interface ExtendedJWT {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  error?: string;
}

// Type for GBP Review
interface GMBReview {
  reviewId: string;
  starRating: string;
  comment?: string;
  name: string;
  reviewer: {
    displayName: string;
  };
}

// Type for GBP Reviews API response
interface ReviewsResponse {
  reviews?: GMBReview[];
}

// Type for OpenAI API response
interface OpenAIResponse {
  choices: { message: { content: string } }[];
}

// Refresh OAuth token
async function refreshAccessToken(token: ExtendedJWT): Promise<ExtendedJWT> {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken || "",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
    };
  } catch (error) {
    console.log("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

// Generate reply with GPT-4o Mini
// Generate reply with GPT-4o Mini (updated prompt)
async function generateReply(
  reviewerName: string | undefined,
  comment: string | undefined,
  rating: number
): Promise<string> {
  try {
    const prompt = `
      Greet the user by name and generate a concise, professional, friendly response, if any name mentioned in the comment use that full name:
      Reviewer: "${reviewerName || "Customer"}"
      Rating: ${rating} stars
      Comment: "${comment || "No comment provided"}"
      Keep it under 50 words, match the sentiment.
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60, // Increased slightly to accommodate name + 50 words
        temperature: 0.7,
      }),
    });

    const data: OpenAIResponse = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error(
      "Error generating reply:",
      error instanceof Error ? error.message : error
    );
    return `Thank you for your feedback, ${reviewerName || "Customer"}!`;
  }
}

// Core auto-reply logic
async function checkAndReply(token: ExtendedJWT): Promise<void> {
  try {
    // Refresh token if expired or invalid
    if (
      !token.accessToken ||
      (token.expiresAt && token.expiresAt < Date.now() / 1000) ||
      token.error
    ) {
      token = await refreshAccessToken(token);
      if (token.error) throw new Error("Failed to refresh token");
    }

    const locations = await prisma.location.findMany();
    console.log(`Processing ${locations.length} locations (expected 46)`);

    for (const location of locations) {
      const reviewsResponse = await fetch(
        `https://mybusiness.googleapis.com/v4/accounts/${process.env.ACCOUNT_ID}/locations/${location.gmbLocationId}/reviews?orderBy=updateTime desc&pageSize=5`,
        {
          headers: {
            Authorization: `Bearer ${token.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const reviewsData: ReviewsResponse = await reviewsResponse.json();
      const reviews: GMBReview[] = reviewsData.reviews || [];

      for (const review of reviews) {
        const exists = await prisma.review.findUnique({
          where: { gmbReviewId: review.reviewId },
        });
        console.log(review);

        if (!exists) {
          const starRatingMap: Record<string, number> = {
            ONE: 1,
            TWO: 2,
            THREE: 3,
            FOUR: 4,
            FIVE: 5,
          };

          const rating: number = starRatingMap[review.starRating] || 0;

          const reply: string = await generateReply(
            review.reviewer.displayName,
            review.comment,
            rating
          );

          // Uncomment to post reply to GBP
          await fetch(
            `https://mybusiness.googleapis.com/v4/${review.name}/reply`,
            {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token.accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ comment: reply }),
            }
          );
          await prisma.review.create({
            data: {
              gmbReviewId: review.reviewId,
              locationId: location.id,
              comment: review.comment || "",
              rating,
              name: review.name,
              responded: true,
              reply,
            },
          });

          console.log(
            `Replied to ${review.reviewId} at ${location.name}: "${reply}"`
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "Error in auto-reply:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
}

// Schedule cron job
if (process.env.NODE_ENV !== "test") {
  cron.schedule("0 * * * *", async () => {
    console.log("Running scheduled auto-reply...");
    const user = await prisma.user.findFirst({
      where: {
        email: "info@techdr.in",
      },
    });
    if (!user || !user.refreshToken) {
      console.error("No user or refresh token available for cron job");
      return;
    }
    const token: ExtendedJWT = {
      accessToken: "", // Initial empty, will be refreshed
      refreshToken: user.refreshToken,
    };
    await checkAndReply(token);
  });
}

// Route Handler for manual trigger
export async function GET(): Promise<NextResponse> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: "info@techdr.in",
      },
    });
    if (!user || !user.refreshToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token: ExtendedJWT = {
      accessToken: "", // Initial empty, will be refreshed
      refreshToken: user.refreshToken,
    };
    await checkAndReply(token);
    return NextResponse.json(
      { message: "Auto-reply process triggered for 46 locations" },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Failed to process auto-reply" },
      { status: 500 }
    );
  }
}
