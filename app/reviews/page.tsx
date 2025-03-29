// app/reviews/page.tsx
import { PrismaClient } from "@prisma/client";
import ReviewsClient from "@/components/ReviewPage";

// This is a Server Component - it can fetch data directly
async function getReviewsData() {
  const prisma = new PrismaClient();

  try {
    // Get all locations for the filter dropdown
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Get all reviews with their location info
    const reviews = await prisma.review.findMany({
      include: {
        location: {
          select: {
            name: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      locations,
      reviews,
      error: null,
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      locations: [],
      reviews: [],
      error: "Failed to load data",
    };
  } finally {
    await prisma.$disconnect();
  }
}

// Server component - default export for the page
export default async function ReviewsPage() {
  const { locations, reviews, error } = await getReviewsData();

  // We need to serialize dates for client components
  const serializedReviews = JSON.parse(JSON.stringify(reviews));

  return (
    <ReviewsClient
      initialLocations={locations}
      initialReviews={serializedReviews}
      error={error}
    />
  );
}
