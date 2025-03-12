// File: app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { schedulePost } from "@/lib/queue";
import { PostFormData } from "@/types/next-auth";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const locationId = searchParams.get("locationId");

  if (!locationId) {
    return NextResponse.json(
      { error: "Location ID is required" },
      { status: 400 }
    );
  }

  try {
    const posts = await prisma.post.findMany({
      where: {
        locationId,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as PostFormData;
    const { locationId, content, imageUrl, scheduledAt, ctaType } = body;
    let { ctaUrl } = body;

    if (!locationId || !content || !scheduledAt) {
      return NextResponse.json(
        { error: "Location ID, content, and scheduled date are required" },
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

    // Clear URL for CALL CTA type
    if (ctaType === "CALL") {
      ctaUrl = undefined;
    }

    const scheduledDate = new Date(scheduledAt);

    // Create post in database
    const newPost = await prisma.post.create({
      data: {
        locationId,
        content,
        imageUrl,
        scheduledAt: scheduledDate,
        status: "scheduled",
        ctaType,
        ctaUrl,
      },
    });

    // Add job to BullMQ queue with user's email
    await schedulePost(newPost.id, scheduledDate, session.user.email);

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
