// File: src/components/posts/PostsList.tsx
"use client";

import { useState, useEffect } from "react";
import { fetchPosts, deletePost } from "@/services/postService";
import PostItem from "./PostItem";
import toast from "react-hot-toast";
import { Post } from "@/types/next-auth";
import {
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfDay,
  endOfDay,
} from "date-fns";

interface PostsListProps {
  selectedLocation: string;
}

export default function PostsList({ selectedLocation }: PostsListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<
    "all" | "scheduled" | "posted" | "failed"
  >("all");

  // Date filter states
  const [dateFilter, setDateFilter] = useState<"all" | "custom">("all");
  const [startDate, setStartDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  // Toggle for collapsible date filter on mobile
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);

  useEffect(() => {
    async function loadPosts() {
      if (selectedLocation) {
        setIsLoading(true);
        try {
          const postsData = await fetchPosts(selectedLocation);
          setPosts(postsData);
        } catch (error) {
          console.error("Failed to load posts:", error);
          toast.error("Failed to load posts");
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadPosts();
  }, [selectedLocation]);

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      setPosts(posts.filter((post) => post.id !== postId));
      toast.success("Post deleted successfully");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const filteredPosts = posts.filter((post) => {
    // Status filter
    if (filter !== "all" && post.status !== filter) {
      return false;
    }

    // Date filter
    if (dateFilter === "custom") {
      const postDate = parseISO(post.scheduledAt);
      const filterStartDate = startOfDay(parseISO(startDate));
      const filterEndDate = endOfDay(parseISO(endDate));

      if (
        isBefore(postDate, filterStartDate) ||
        isAfter(postDate, filterEndDate)
      ) {
        return false;
      }
    }

    return true;
  });

  const resetDateFilter = () => {
    setDateFilter("all");
    setStartDate(format(new Date(), "yyyy-MM-dd"));
    setEndDate(format(new Date(), "yyyy-MM-dd"));
  };

  const applyDateFilter = () => {
    setDateFilter("custom");
    // Auto-collapse date filter on mobile after applying
    if (window.innerWidth < 640) {
      setShowDateFilter(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-black">Upcoming Posts</h3>
          <div className="md:hidden">
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-md"
            >
              {showDateFilter ? "Hide Filters" : "Show Filters"}
            </button>
          </div>
        </div>

        {/* Status Filters - Responsive row */}
        <div
          className={`mt-3 flex flex-wrap gap-2 ${
            !showDateFilter && "md:mb-0"
          }`}
        >
          <button
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-full font-medium transition-colors duration-200 ${
              filter === "all"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-black hover:bg-gray-200"
            }`}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-full font-medium transition-colors duration-200 ${
              filter === "scheduled"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
            onClick={() => setFilter("scheduled")}
          >
            Scheduled
          </button>
          <button
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-full font-medium transition-colors duration-200 ${
              filter === "posted"
                ? "bg-green-600 text-white"
                : "bg-green-50 text-green-600 hover:bg-green-100"
            }`}
            onClick={() => setFilter("posted")}
          >
            Posted
          </button>
          <button
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-full font-medium transition-colors duration-200 ${
              filter === "failed"
                ? "bg-red-600 text-white"
                : "bg-red-50 text-red-600 hover:bg-red-100"
            }`}
            onClick={() => setFilter("failed")}
          >
            Failed
          </button>
        </div>

        {/* Date Filter - Collapsible on mobile */}
        <div
          className={`${
            showDateFilter || window.innerWidth >= 768 ? "block" : "hidden"
          } md:block mt-4 border-t border-gray-200 pt-4`}
        >
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-black mb-2">
              Filter by Date
            </h4>
            {dateFilter === "custom" && (
              <button
                onClick={resetDateFilter}
                className="text-xs px-2 py-1 text-blue-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label
                htmlFor="start-date"
                className="block text-xs text-black mb-1"
              >
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-black"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="end-date"
                className="block text-xs text-black mb-1"
              >
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                className="w-full px-2 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-md text-black"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={applyDateFilter}
                className="w-full sm:w-auto px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Apply
              </button>
            </div>
          </div>

          {dateFilter === "custom" && (
            <div className="mt-2 text-xs text-black bg-blue-50 p-2 rounded-md">
              <span className="hidden sm:inline">Showing posts from </span>
              {format(parseISO(startDate), "MMM d, yyyy")} to{" "}
              {format(parseISO(endDate), "MMM d, yyyy")}
            </div>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-[calc(100vh-320px)] sm:max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-black">Loading posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <p className="text-black">No posts found</p>
            <p className="text-black text-sm mt-1">
              Try creating a new post or changing your filters
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostItem key={post.id} post={post} onDelete={handleDeletePost} />
          ))
        )}
      </div>

      {/* Mobile filter active indicator */}
      {dateFilter === "custom" && !showDateFilter && (
        <div className="md:hidden fixed bottom-4 right-4 bg-blue-600 text-white text-xs px-3 py-2 rounded-full shadow-lg">
          <button onClick={() => setShowDateFilter(true)}>
            Date Filter Active
          </button>
        </div>
      )}
    </div>
  );
}
