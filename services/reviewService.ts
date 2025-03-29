import { Review } from "@/types/next-auth";

export const fetchReviewsByLocation = async (
  locationId: string
): Promise<Review[]> => {
  const response = await fetch(`/api/reviews?locationId=${locationId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch reviews");
  }
  return response.json();
};

export const submitReply = async (reviewId: string, reply: string) => {
  const response = await fetch(`/api/reviews/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reviewId, reply }),
  });
  if (!response.ok) {
    throw new Error("Failed to submit reply");
  }
  return response.json();
};

export const submitReviewEdit = async (reviewId: string, comment: string) => {
  const response = await fetch(`/api/reviews/${reviewId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment }),
  });
  if (!response.ok) {
    throw new Error("Failed to update review");
  }
  return response.json();
};

export const updateReply = async (
  reviewId: string,
  reply: string,
  gmbReviewName: string
) => {
  const response = await fetch("/api/reviews/update-reply", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reviewId, reply, gmbReviewName }),
  });

  if (!response.ok) {
    throw new Error("Failed to update reply");
  }

  return response.json();
};
