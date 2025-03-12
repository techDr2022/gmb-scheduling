// File: src/components/auth/LoginPrompt.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPrompt() {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {isLoading ? "Signing in..." : "Get Started"}
    </button>
  );
}
