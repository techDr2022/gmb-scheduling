import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reviewId, reply, gmbReviewName } = await request.json();
    console.log(session);
    console.log(session.accessToken);
    console.log(reviewId);
    console.log(reply);
    console.log(gmbReviewName);

    // Update reply on GMB
    const gmbResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${gmbReviewName}/reply`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ comment: reply }),
      }
    );

    if (!gmbResponse.ok) {
      throw new Error("Failed to update GMB reply");
    }

    // Update reply in database
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { reply },
    });

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error("Error updating reply:", error);
    return NextResponse.json(
      { error: "Failed to update reply" },
      { status: 500 }
    );
  }
}
