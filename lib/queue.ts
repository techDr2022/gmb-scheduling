// lib/queue.ts
import * as dotenv from "dotenv";
dotenv.config();
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import prisma from "./prisma";
import axios from "axios";

// Create Redis connection using separate host, port, and password
const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Must be null for BullMQ
  enableReadyCheck: false, // Can help with connection stability
});

//Test Connection
// Test connection
connection.on("connect", () => {
  console.log("Successfully connected to Redis");
});

connection.on("error", (err) => {
  console.error("Redis connection error:", err);
});

// Create GMB post queue with delayed job processing enabled
export const postQueue = new Queue("gmb-posts", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Helper function to refresh access token
async function refreshUserAccessToken(refreshToken: string): Promise<string> {
  const url = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${data.error}`);
  }

  return data.access_token;
}

// Initialize the worker and register event handlers
// This will only run on the server side
if (typeof window === "undefined") {
  const worker = new Worker(
    "gmb-posts",
    async (job) => {
      console.log(`Processing job ${job.id} with data:`, job.data);
      const { postId, userEmail } = job.data;

      try {
        // Get the post details from database
        const post = await prisma.post.findUnique({
          where: { id: postId },
          include: { location: true },
        });

        if (!post) {
          throw new Error(`Post with ID ${postId} not found`);
        }

        // Get user from database to retrieve refresh token
        const user = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (!user || !user.refreshToken) {
          throw new Error(`User not found or missing refresh token`);
        }

        // Get fresh access token using the refresh token
        const accessToken = await refreshUserAccessToken(user.refreshToken);

        if (!accessToken) {
          throw new Error("Failed to get access token");
        }

        const apiUrl = `https://mybusiness.googleapis.com/v4/accounts/102239766967710116553/locations/${post.location.gmbLocationId}/localPosts`;

        // Construct post data with image and call-to-action
        interface PostData {
          summary: string;
          languageCode: string;
          topicType: string;
          media: { mediaFormat: string; sourceUrl: string }[];
          callToAction?: { actionType: string; url?: string };
        }

        const postData: PostData = {
          summary: post.content,
          languageCode: "en",
          topicType: "STANDARD",
          media: post.imageUrl
            ? [
                {
                  mediaFormat: "PHOTO",
                  sourceUrl: post.imageUrl,
                },
              ]
            : [],
        };

        // Add call-to-action if specified
        if (post.ctaType) {
          // Map our CTA types to Google's action types
          type CTAType =
            | "LEARN_MORE"
            | "BOOK"
            | "ORDER"
            | "BUY"
            | "SIGN_UP"
            | "CALL";
          const actionTypeMap: Record<CTAType, string> = {
            LEARN_MORE: "LEARN_MORE",
            BOOK: "BOOK",
            ORDER: "ORDER",
            BUY: "BUY",
            SIGN_UP: "SIGN_UP",
            CALL: "CALL",
          };

          const callToAction: { actionType: string; url?: string } = {
            actionType: actionTypeMap[post.ctaType as CTAType] || "LEARN_MORE",
          };

          // For all action types except CALL, we need a URL
          if (post.ctaType !== "CALL" && post.ctaUrl) {
            callToAction.url = post.ctaUrl;
          }
          // For CALL action type, use the location's phone number
          else if (post.ctaType === "CALL" && post.location.phoneNumber) {
            // The Google API handles the phone number automatically for CALL actions
            // We don't need to specify it here as it uses the business profile phone number
          }

          postData["callToAction"] = callToAction;
        }

        console.log(`Creating post for location: ${post.location.name}`);
        console.log("postData:", postData);

        // Make the API call using Axios
        const config = {
          method: "post",
          maxBodyLength: Infinity,
          url: apiUrl,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          data: postData,
        };

        const response = await axios.request(config);
        console.log(`Response status: ${response.status}`);

        console.log(
          `Post created successfully for location: ${post.location.name}`
        );
        console.log(`Post content: ${post.content}`);
        if (post.ctaType) {
          console.log(`Post has a "${post.ctaType}" call-to-action`);
        }

        // Update post status to 'posted' in database
        await prisma.post.update({
          where: { id: postId },
          data: { status: "posted" },
        });

        console.log(`Job ${job.id} completed successfully, post published.`);
        return { success: true, postId };
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);

        // Update post status to 'failed' in database
        await prisma.post.update({
          where: { id: postId },
          data: { status: "failed" },
        });

        // Re-throw the error to trigger the retry mechanism
        throw error;
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 jobs simultaneously
      lockDuration: 30000, // Lock job for 30 seconds
    }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} has been completed successfully`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} has failed:`, error);
  });

  worker.on("error", (err) => {
    console.error("Worker error:", err);
  });
}

// Helper function to add a post to the queue
export async function schedulePost(
  postId: string,
  scheduledDate: Date,
  userEmail: string
): Promise<void> {
  const now = new Date();
  const delay = Math.max(0, scheduledDate.getTime() - now.getTime());

  try {
    await postQueue.add(
      "publish-post",
      { postId, userEmail },
      {
        delay,
        jobId: `post-${postId}`,
      }
    );
    console.log(`Post ${postId} scheduled for ${scheduledDate.toISOString()}`);
  } catch (error) {
    console.error(`Failed to schedule post ${postId}:`, error);
    throw error;
  }
}

// Helper function to remove a post from the queue
export async function unschedulePost(postId: string): Promise<void> {
  try {
    await postQueue.remove(`post-${postId}`);
    console.log(`Post ${postId} removed from queue`);
  } catch (error) {
    console.error(`Failed to unschedule post ${postId}:`, error);
    throw error;
  }
}

// Helper function to update a post in the queue
export async function reschedulePost(
  postId: string,
  newScheduledDate: Date,
  userEmail: string
): Promise<void> {
  try {
    // First remove the existing job
    await unschedulePost(postId);

    // Then add it again with the new time
    await schedulePost(postId, newScheduledDate, userEmail);

    console.log(
      `Post ${postId} rescheduled for ${newScheduledDate.toISOString()}`
    );
  } catch (error) {
    console.error(`Failed to reschedule post ${postId}:`, error);
    throw error;
  }
}

// Function to check if queue is operational
export async function checkQueueHealth(): Promise<boolean> {
  try {
    // Check if we can get queue info
    const info = await postQueue.getJobCounts();
    console.log("Queue status:", info);
    return true;
  } catch (error) {
    console.error("Queue health check failed:", error);
    return false;
  }
}

// Export the queue for potential external use
export { connection };
