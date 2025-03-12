"use client";

import { format, isSameMonth, isSameDay, parseISO, isAfter } from "date-fns";
import { Post } from "@/types/next-auth";

interface CalendarDayProps {
  day: Date;
  currentMonth: Date;
  isToday: boolean;
  posts: Post[];
  onSelect: () => void;
}

export default function CalendarDay({
  day,
  currentMonth,
  isToday,
  posts,
  onSelect,
}: CalendarDayProps) {
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isPastDay = !isAfter(day, new Date()) && !isSameDay(day, new Date());

  // Calculate the count of each status
  const statusCounts = {
    scheduled: posts.filter((post) => post.status === "scheduled").length,
    posted: posts.filter((post) => post.status === "posted").length,
    failed: posts.filter((post) => post.status === "failed").length,
  };

  return (
    <div
      className={`min-h-[110px] bg-white p-2 transition-colors ${
        !isCurrentMonth ? "text-gray-400 bg-gray-50" : ""
      } ${isPastDay ? "bg-gray-50" : ""} ${
        isToday ? "bg-blue-50" : ""
      } hover:bg-gray-50 cursor-pointer`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm 
            ${
              isToday
                ? "bg-blue-600 text-white font-medium"
                : isCurrentMonth
                ? "text-gray-900"
                : "text-gray-400"
            }`}
        >
          {format(day, "d")}
        </span>

        {posts.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
            {posts.length}
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1 overflow-y-auto max-h-[65px]">
        {posts.length > 0 && (
          <div className="flex space-x-1 mb-1">
            {statusCounts.scheduled > 0 && (
              <span
                className="h-2 w-2 rounded-full bg-blue-500"
                title={`${statusCounts.scheduled} scheduled`}
              ></span>
            )}
            {statusCounts.posted > 0 && (
              <span
                className="h-2 w-2 rounded-full bg-green-500"
                title={`${statusCounts.posted} posted`}
              ></span>
            )}
            {statusCounts.failed > 0 && (
              <span
                className="h-2 w-2 rounded-full bg-red-500"
                title={`${statusCounts.failed} failed`}
              ></span>
            )}
          </div>
        )}

        {posts.slice(0, 2).map((post) => (
          <div
            key={post.id}
            className={`text-xs p-1 rounded truncate ${
              post.status === "posted"
                ? "bg-green-100 text-green-800"
                : post.status === "failed"
                ? "bg-red-100 text-red-800"
                : "bg-blue-100 text-blue-700"
            }`}
            title={post.content}
          >
            {format(parseISO(post.scheduledAt), "h:mm a")}:{" "}
            {post.content.substring(0, 15)}...
          </div>
        ))}
        {posts.length > 2 && (
          <div className="text-xs text-gray-500 font-medium pl-1">
            +{posts.length - 2} more...
          </div>
        )}
      </div>
    </div>
  );
}
