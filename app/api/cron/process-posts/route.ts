// app/api/cron/process-posts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { postQueue } from "@/lib/queue";

export async function GET() {
  try {
    // Get all scheduled posts that should have been published by now
    const now = new Date();
    const overdueScheduledPosts = await prisma.post.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          lte: now, // Posts that should have been published already
        },
      },
      include: {
        location: true,
      },
    });

    console.log(
      `Found ${overdueScheduledPosts.length} overdue scheduled posts`
    );

    // Process each post
    const processedPosts = [];
    for (const post of overdueScheduledPosts) {
      try {
        // Get a user with access to this location
        const user = await prisma.user.findFirst({
          where: {
            email: {
              not: null,
            },
          },
          orderBy: {
            id: "asc",
          },
        });

        if (!user || !user.email) {
          console.error(`No user found for post ${post.id}`);
          continue;
        }

        // Check if there's already a job for this post
        const existingJob = await postQueue.getJob(`post-${post.id}`);

        if (!existingJob) {
          // Add a new job to the queue with no delay
          await postQueue.add(
            "publish-post",
            { postId: post.id, userEmail: user.email },
            {
              jobId: `post-${post.id}`,
              delay: 0, // Process immediately
            }
          );

          processedPosts.push({
            id: post.id,
            location: post.location.name,
            content: post.content.substring(0, 30) + "...", // Truncate for logging
          });

          console.log(`Created new job for post ${post.id}`);
        } else {
          // Job exists, check if it needs to be promoted
          const jobState = await existingJob.getState();

          if (jobState === "delayed") {
            await existingJob.promote();
            console.log(`Promoted existing job for post ${post.id}`);

            processedPosts.push({
              id: post.id,
              location: post.location.name,
              content: post.content.substring(0, 30) + "...",
              status: "promoted",
            });
          }
        }
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
      }
    }

    // Get all failed posts that should be retried
    const failedPosts = await prisma.post.findMany({
      where: {
        status: "failed",
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Failed in the last 24 hours
        },
      },
    });

    const retriedPosts = [];
    for (const post of failedPosts) {
      try {
        const user = await prisma.user.findFirst({
          where: {
            email: {
              not: null,
            },
          },
        });

        if (!user || !user.email) continue;

        // Update status back to scheduled
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "scheduled" },
        });

        // Create a new job
        await postQueue.add(
          "publish-post",
          { postId: post.id, userEmail: user.email },
          {
            jobId: `post-${post.id}-retry-${Date.now()}`,
            delay: 0,
          }
        );

        retriedPosts.push({
          id: post.id,
          content: post.content.substring(0, 30) + "...",
        });
      } catch (error) {
        console.error(`Error retrying failed post ${post.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: processedPosts.length,
      retriedCount: retriedPosts.length,
      processed: processedPosts,
      retried: retriedPosts,
    });
  } catch (error: unknown) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// Export config to increase the function timeout for Vercel Pro
export const config = {
  maxDuration: 60, // Maximum execution time in seconds
};
