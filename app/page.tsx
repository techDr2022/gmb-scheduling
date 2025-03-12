// File: src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoginPrompt from "@/components/auth/LoginPrompt";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <div className="min-h-screen py-12 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl md:text-6xl">
            <span className="block">GMB Post Scheduler</span>
            <span className="block text-blue-600">
              Simplify Your Business Posts
            </span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Schedule, edit, and manage Google My Business posts effortlessly
            with our calendar-based scheduling system.
          </p>
          <div className="mt-10">
            <LoginPrompt />
          </div>
        </div>
      </div>
    </div>
  );
}
