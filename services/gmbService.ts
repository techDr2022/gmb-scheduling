"use server";
import { Session } from "next-auth";
import prisma from "@/lib/prisma";

interface CustomSession extends Session {
  accessToken?: string;
}

export async function fetchAndStoreGMBLocations(session: CustomSession) {
  if (!session.accessToken) {
    throw new Error("No access token available");
  }

  console.log("Fetching and storing GMB locations...");
  const BATCH_SIZE = 10; // Process 10 locations at a time
  const MAX_CONCURRENT = 3; // Max 3 API calls simultaneously
  const TIMEOUT_BUFFER = 8000; // 8 seconds before Vercel timeout
  const startTime = Date.now();

  try {
    // Step 1: Fetch accounts
    const accountsResponse = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!accountsResponse.ok) {
      throw new Error(
        `Failed to fetch accounts: ${accountsResponse.statusText}`
      );
    }

    const accountsData = await accountsResponse.json();
    const accounts = accountsData.accounts || [];

    console.log("Found accounts:", accounts.length);
    console.log("Access token available:", !!session.accessToken);

    let totalProcessed = 0;
    let totalSkipped = 0;

    // Step 2: Process location group accounts and fetch their locations
    for (const account of accounts) {
      // Check timeout before processing each account
      if (Date.now() - startTime > TIMEOUT_BUFFER) {
        console.log(
          "Approaching timeout, stopping early. Processed:",
          totalProcessed
        );
        break;
      }

      if (account.type === "LOCATION_GROUP") {
        const accountId = account.name.split("/").pop();

        try {
          // Fetch locations for this account
          const locationsResponse = await fetch(
            `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,storefrontAddress,title,websiteUri,phoneNumbers&pageSize=100`,
            {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }
          );

          console.log("Locations response status:", locationsResponse.status);

          if (!locationsResponse.ok) {
            console.error(
              `Failed to fetch locations for account ${accountId}: ${locationsResponse.statusText}`
            );
            continue;
          }

          const locationsData = await locationsResponse.json();
          const locations = locationsData.locations || [];

          console.log(
            `Found ${locations.length} locations for account ${accountId}`
          );

          // Step 3: Process locations in batches with concurrency control
          for (let i = 0; i < locations.length; i += BATCH_SIZE) {
            // Check timeout before each batch
            if (Date.now() - startTime > TIMEOUT_BUFFER) {
              console.log("Timeout approaching, stopping batch processing");
              break;
            }

            const batch = locations.slice(i, i + BATCH_SIZE);

            // Process batch with limited concurrency
            const semaphore = new Array(MAX_CONCURRENT).fill(null);
            const batchPromises = batch.map(async (location, index) => {
              // Wait for available slot
              await semaphore[index % MAX_CONCURRENT];

              const promise = processLocationWithUpsert(location);
              semaphore[index % MAX_CONCURRENT] = promise.catch(() => {});

              return promise;
            });

            const results = await Promise.allSettled(batchPromises);

            // Count successful vs failed operations
            const successful = results.filter(
              (r) => r.status === "fulfilled"
            ).length;
            const failed = results.filter(
              (r) => r.status === "rejected"
            ).length;

            totalProcessed += successful;
            totalSkipped += failed;

            console.log(
              `Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
                locations.length / BATCH_SIZE
              )} completed: ${successful} successful, ${failed} failed`
            );

            // Small delay to prevent overwhelming the database
            if (i + BATCH_SIZE < locations.length) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
          }
        } catch (error) {
          console.error(`Error processing account ${accountId}:`, error);
          continue;
        }
      }
    }

    console.log(
      `Processing complete. Total processed: ${totalProcessed}, Total skipped: ${totalSkipped}`
    );

    return {
      success: true,
      processed: totalProcessed,
      skipped: totalSkipped,
      timeElapsed: Date.now() - startTime,
    };
  } catch (error) {
    console.error("Error fetching and storing GMB locations:", error);
    throw error;
  }
}

async function processLocationWithUpsert(location: any) {
  const locationId = location.name.split("/").pop();
  const locationName = location.title || "Unnamed Location";

  return prisma.location.upsert({
    where: {
      gmbLocationId: locationId,
    },
    update: {
      name: locationName,
      phoneNumber: location.phoneNumbers?.primaryPhone ?? null,
    },
    create: {
      gmbLocationId: locationId,
      name: locationName,
      phoneNumber: location.phoneNumbers?.primaryPhone ?? null,
    },
  });
}
