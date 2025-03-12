import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { reschedulePost, unschedulePost } from "@/lib/queue";
import { PostFormData } from "@/types/next-auth";
import { NextRouteHandler } from "@/types/next-route";

export const PUT: NextRouteHandler = async (request: NextRequest, context) => {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = context.params;
  console.log("id", id);

  try {
    const body = (await request.json()) as Partial<PostFormData>;
    const { content, imageUrl, scheduledAt, ctaType, ctaUrl } = body;

    // Check if the post exists and is still scheduled
    const existingPost = await prisma.post.findUnique({
      where: { id: id as string },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.status !== "scheduled") {
      return NextResponse.json(
        {
          error: "Cannot update a post that has already been posted or failed",
        },
        { status: 400 }
      );
    }

    // Validate CTA fields - URL is required for all CTA types except "CALL"
    if (ctaType && ctaType !== "CALL" && !ctaUrl) {
      return NextResponse.json(
        {
          error:
            "CTA URL is required when CTA type is provided (except for 'Call now')",
        },
        { status: 400 }
      );
    }

    // Validate CTA URL format if provided
    if (ctaUrl && !ctaUrl.match(/^(https?:\/\/)/)) {
      return NextResponse.json(
        { error: "CTA URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: {
      content?: string;
      imageUrl?: string | null;
      scheduledAt?: Date;
      ctaType?: string | null;
      ctaUrl?: string | null;
    } = {};

    if (content) updateData.content = content;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    // Handle CTA updates
    if (ctaType !== undefined) {
      updateData.ctaType = ctaType || null;

      // Clear URL for CALL CTA type or when CTA type is removed
      if (ctaType === "CALL" || !ctaType) {
        updateData.ctaUrl = null;
      } else if (ctaUrl !== undefined) {
        updateData.ctaUrl = ctaUrl;
      }
    } else if (ctaUrl !== undefined) {
      // Only URL was updated
      updateData.ctaUrl = ctaUrl;
    }

    let newScheduledDate: Date | undefined;
    if (scheduledAt) {
      newScheduledDate = new Date(scheduledAt);
      updateData.scheduledAt = newScheduledDate;
    }

    // Update post in database
    const updatedPost = await prisma.post.update({
      where: { id: id as string },
      data: updateData,
    });

    // Update job in BullMQ queue if the scheduled date changed
    if (newScheduledDate) {
      // Get the user's email from the session
      const userEmail = session.user.email;

      // Then add it again with the new time and user email
      await reschedulePost(id as string, newScheduledDate, userEmail);

      console.log(
        `Post ${id} rescheduled for ${newScheduledDate.toISOString()} by user ${userEmail}`
      );
    }

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
};

export const DELETE: NextRouteHandler = async (
  request: NextRequest,
  context
) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = context.params;

  try {
    // Check if the post exists and is still scheduled
    const existingPost = await prisma.post.findUnique({
      where: { id: id as string },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existingPost.status !== "scheduled") {
      return NextResponse.json(
        {
          error: "Cannot delete a post that has already been posted or failed",
        },
        { status: 400 }
      );
    }

    // Remove job from BullMQ queue
    await unschedulePost(id as string);

    // Delete post from database
    await prisma.post.delete({
      where: { id: id as string },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
};
