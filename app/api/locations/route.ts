import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const locations = await prisma.location.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { gmbLocationId, name } = body;

    if (!gmbLocationId || !name) {
      return NextResponse.json(
        { error: "GMB Location ID and name are required" },
        { status: 400 }
      );
    }

    // Check if location already exists
    const existingLocation = await prisma.location.findFirst({
      where: {
        gmbLocationId,
      },
    });

    if (existingLocation) {
      return NextResponse.json(
        { error: "Location already exists" },
        { status: 400 }
      );
    }

    const newLocation = await prisma.location.create({
      data: {
        gmbLocationId,
        name,
      },
    });

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
