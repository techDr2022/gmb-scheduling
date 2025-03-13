// app/api/ping-worker/route.ts
import { NextResponse } from "next/server";
import { postQueue } from "@/lib/queue";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Find posts that should have been published
    const now = new Date();
    const overdueScheduledPosts = await prisma.post.findMany({
      where: {
        status: "scheduled",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        location: true,
      },
      take: 10, // Limit to 10 at a time to avoid timeout
    });

    console.log(
      `Found ${overdueScheduledPosts.length} overdue scheduled posts`
    );

    // Process each post
    const processed = [];
    for (const post of overdueScheduledPosts) {
      try {
        // Get a user with access to this location
        const user = await prisma.user.findFirst({
          where: {
            email: {
              not: null,
            },
          },
        });

        if (!user || !user.email) continue;

        // Check if there's already a job for this post
        const existingJob = await postQueue.getJob(`post-${post.id}`);

        if (!existingJob) {
          // Add a new job with no delay
          await postQueue.add(
            "publish-post",
            { postId: post.id, userEmail: user.email },
            {
              jobId: `post-${post.id}`,
              delay: 0,
            }
          );

          processed.push(post.id);
        } else {
          // Promote the job if it's delayed
          const jobState = await existingJob.getState();
          if (jobState === "delayed") {
            await existingJob.promote();
            processed.push(post.id);
          }
        }
      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
      }
    }

    // Check for any failed jobs and retry them
    const failedJobs = await postQueue.getFailed();
    const retried = [];

    for (const job of failedJobs) {
      try {
        if (job.attemptsMade < 3) {
          await job.retry();
          retried.push(job.id);
        }
      } catch (error) {
        console.error(`Error retrying job ${job.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      retried,
      queueStats: await postQueue.getJobCounts(),
    });
  } catch (error) {
    console.error("Error in ping worker:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// Export config to increase the function timeout for Vercel
export const config = {
  maxDuration: 60, // Maximum execution time in seconds (for Vercel Pro)
};
