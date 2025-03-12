// types/next-route.d.ts
import { NextRequest, NextResponse } from "next/server";

export type NextRouteHandler<T = unknown> = (
  req: NextRequest,
  context: {
    params: Record<string, string | string[]>;
  }
) => Promise<NextResponse<T>>;
