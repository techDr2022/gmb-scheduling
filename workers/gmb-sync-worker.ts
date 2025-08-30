// workers/gmb-sync-worker.ts
import { Worker } from "bullmq";
import { connection } from "@/lib/queue";
import { fetchAndStoreGMBLocations } from "@/services/gmbService";

// Create a worker to process GMB sync jobs
const gmbSyncWorker = new Worker(
  "gmb-posts", // Use the existing queue
  async (job) => {
    if (job.name === "sync-gmb-locations") {
      console.log(`Processing GMB sync job ${job.id}`);

      const { accessToken } = job.data;

      if (!accessToken) {
        throw new Error("No access token provided for GMB sync");
      }

      // Create a mock session object for the worker
      const mockSession = {
        accessToken,
        user: { id: "worker", email: "worker@system" },
        expires: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };

      // Process the GMB sync
      const result = await fetchAndStoreGMBLocations(mockSession);

      console.log(`GMB sync job ${job.id} completed:`, result);

      return result;
    }

    // For other job types, just return without processing
    return { skipped: true, reason: "Not a GMB sync job" };
  },
  {
    connection,
    concurrency: 1, // Process one GMB sync at a time to avoid overwhelming the API
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
      count: 50,
    },
  }
);

// Handle worker events
gmbSyncWorker.on("completed", (job) => {
  console.log(`GMB sync job ${job.id} completed successfully`);
});

gmbSyncWorker.on("failed", (job, err) => {
  if (job) {
    console.error(`GMB sync job ${job.id} failed:`, err);
  } else {
    console.error("GMB sync job failed:", err);
  }
});

gmbSyncWorker.on("error", (err) => {
  console.error("GMB sync worker error:", err);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down GMB sync worker...");
  await gmbSyncWorker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down GMB sync worker...");
  await gmbSyncWorker.close();
  process.exit(0);
});

console.log("GMB sync worker started and listening for jobs...");

export default gmbSyncWorker;
