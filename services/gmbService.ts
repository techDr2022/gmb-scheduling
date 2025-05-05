// src/services/gmbService.ts
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

    console.log(accounts);

    console.log("aceess token", session.accessToken);

    // Step 2: Process location group accounts and fetch their locations
    for (const account of accounts) {
      if (account.type === "LOCATION_GROUP") {
        const accountId = account.name.split("/").pop();

        // Fetch locations for this account
        const locationsResponse = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,storefrontAddress,title,websiteUri,phoneNumbers&pageSize=100`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );

        console.log("locationsResponse", locationsResponse);

        if (!locationsResponse.ok) {
          console.error(
            `Failed to fetch locations for account ${accountId}: ${locationsResponse.statusText}`
          );
          continue;
        }

        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];

        // Step 3: Store locations in database
        for (const location of locations) {
          const locationId = location.name.split("/").pop();
          const locationName = location.title || "Unnamed Location";

          // Check if location already exists in database
          const existingLocation = await prisma.location.findFirst({
            where: {
              gmbLocationId: locationId,
            },
          });

          if (!existingLocation) {
            // Create new location record
            await prisma.location.create({
              data: {
                gmbLocationId: locationId,
                name: locationName,
                phoneNumber: location.phoneNumbers.primaryPhone,
              },
            });
          } else {
            // Update existing location if name has changed
            if (
              existingLocation.name !== locationName ||
              existingLocation.phoneNumber !==
                location.phoneNumbers.primaryPhone
            ) {
              await prisma.location.update({
                where: {
                  id: existingLocation.id,
                },
                data: {
                  name: locationName,
                  phoneNumber: location.phoneNumbers.primaryPhone ?? null,
                },
              });
            }
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error fetching and storing GMB locations:", error);
    throw error;
  }
}
