// File: src/components/dashboard/DashboardStats.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchPosts } from "@/services/postService";
import {
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

interface DashboardStatsProps {
  selectedLocation: string | null;
}

interface Stats {
  total: number;
  scheduled: number;
  posted: number;
  failed: number;
}

export default function DashboardStats({
  selectedLocation,
}: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    scheduled: 0,
    posted: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadStats() {
      if (selectedLocation) {
        setLoading(true);
        try {
          const posts = await fetchPosts(selectedLocation);

          const newStats = {
            total: posts.length,
            scheduled: posts.filter((post) => post.status === "scheduled")
              .length,
            posted: posts.filter((post) => post.status === "posted").length,
            failed: posts.filter((post) => post.status === "failed").length,
          };

          setStats(newStats);
        } catch (error) {
          console.error("Failed to load stats:", error);
        } finally {
          setLoading(false);
        }
      }
    }

    loadStats();
  }, [selectedLocation]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="h-24 animate-pulse bg-gray-200"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-md overflow-hidden transition-transform hover:scale-103 hover:shadow-lg">
        <div className="px-4 py-5 sm:p-6 text-white">
          <div className="flex justify-between items-center">
            <dt className="text-sm font-medium truncate">Total Posts</dt>
            <CalendarIcon className="h-8 w-8 text-purple-200" />
          </div>
          <dd className="mt-2 text-3xl font-semibold">{stats.total}</dd>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md overflow-hidden transition-transform hover:scale-103 hover:shadow-lg">
        <div className="px-4 py-5 sm:p-6 text-white">
          <div className="flex justify-between items-center">
            <dt className="text-sm font-medium truncate">Scheduled Posts</dt>
            <ClockIcon className="h-8 w-8 text-blue-200" />
          </div>
          <dd className="mt-2 text-3xl font-semibold">{stats.scheduled}</dd>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md overflow-hidden transition-transform hover:scale-103 hover:shadow-lg">
        <div className="px-4 py-5 sm:p-6 text-white">
          <div className="flex justify-between items-center">
            <dt className="text-sm font-medium truncate">
              Posted Successfully
            </dt>
            <CheckCircleIcon className="h-8 w-8 text-green-200" />
          </div>
          <dd className="mt-2 text-3xl font-semibold">{stats.posted}</dd>
        </div>
      </div>

      <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-lg shadow-md overflow-hidden transition-transform hover:scale-103 hover:shadow-lg">
        <div className="px-4 py-5 sm:p-6 text-white">
          <div className="flex justify-between items-center">
            <dt className="text-sm font-medium truncate">Failed Posts</dt>
            <XCircleIcon className="h-8 w-8 text-red-200" />
          </div>
          <dd className="mt-2 text-3xl font-semibold">{stats.failed}</dd>
        </div>
      </div>
    </div>
  );
}
