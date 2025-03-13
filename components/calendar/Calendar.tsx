"use client";

import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  parseISO,
  isAfter,
  isSameDay,
  startOfWeek,
  endOfWeek,
  subMonths,
  addMonths,
} from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import CalendarDay from "./CalendarDay";
import CreatePostModal from "@/components/posts/CreatePostModal";
import { fetchPosts } from "@/services/postService";
import { Post } from "@/types/next-auth";
import toast from "react-hot-toast";

interface CalendarProps {
  selectedLocation: string;
}

export default function Calendar({ selectedLocation }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");

  // Get days in month with padding for complete weeks
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Day name headers
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  }, [selectedLocation, currentMonth]);

  const prevMonth = () => {
    setCurrentMonth((month) => subMonths(month, 1));
  };

  const nextMonth = () => {
    setCurrentMonth((month) => addMonths(month, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const openCreatePostModal = (date: Date) => {
    // Only allow scheduling posts for future dates
    if (isAfter(date, new Date()) || isSameDay(date, new Date())) {
      setSelectedDate(date);
      setIsModalOpen(true);
    } else {
      toast.error("Cannot schedule posts for past dates");
    }
  };

  const getPostsForDate = (date: Date): Post[] => {
    return posts.filter((post) => {
      const postDate = parseISO(post.scheduledAt);
      return isSameDay(postDate, date);
    });
  };

  const handleCreateSuccess = (newPost: Post) => {
    setPosts((currentPosts) => [...currentPosts, newPost]);
    setIsModalOpen(false);
    toast.success("Post scheduled successfully!");
  };

  // Group posts by date for agenda view
  const postsByDate = posts.reduce((acc: { [key: string]: Post[] }, post) => {
    const dateStr = format(parseISO(post.scheduledAt), "yyyy-MM-dd");
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(post);
    return acc;
  }, {});

  // Sort dates for agenda view
  const sortedDates = Object.keys(postsByDate).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Filter upcoming posts for agenda view
  const upcomingDates = sortedDates.filter((dateStr) => {
    const date = new Date(dateStr);
    return isAfter(date, new Date()) || isSameDay(date, new Date());
  });

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <div className="ml-4 flex space-x-1">
              <button
                onClick={prevMonth}
                className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all duration-200"
                aria-label="Previous month"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all duration-200"
                aria-label="Next month"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={goToToday}
                className="ml-2 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex space-x-2">
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode("month")}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === "month"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode("agenda")}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                  viewMode === "agenda"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Agenda
              </button>
            </div>

            <button
              onClick={() => openCreatePostModal(new Date())}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircleIcon className="h-4 w-4 mr-1" /> New Post
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : viewMode === "month" ? (
        <div className="bg-white">
          <div className="grid grid-cols-7 gap-px border-b border-gray-200">
            {dayNames.map((day) => (
              <div
                key={day}
                className="bg-gray-50 py-2 text-center text-sm font-medium text-gray-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {calendarDays.map((day) => {
              const dayPosts = getPostsForDate(day);
              return (
                <CalendarDay
                  key={day.toString()}
                  day={day}
                  currentMonth={currentMonth}
                  isToday={isToday(day)}
                  posts={dayPosts}
                  onSelect={() => openCreatePostModal(day)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
          {upcomingDates.length > 0 ? (
            upcomingDates.map((dateStr) => {
              const date = new Date(dateStr);
              const formattedDate = format(date, "EEEE, MMMM d, yyyy");
              const postsForDate = postsByDate[dateStr];

              return (
                <div key={dateStr} className="p-4">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-sm font-medium ${
                        isToday(date) ? "text-blue-600" : "text-gray-900"
                      }`}
                    >
                      {formattedDate}{" "}
                      {isToday(date) && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => openCreatePostModal(date)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <PlusCircleIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-2 space-y-2">
                    {postsForDate.map((post) => (
                      <div
                        key={post.id}
                        className={`p-3 rounded-md ${
                          post.status === "posted"
                            ? "bg-green-50 border border-green-100"
                            : post.status === "failed"
                            ? "bg-red-50 border border-red-100"
                            : "bg-blue-50 border border-blue-100"
                        }`}
                      >
                        <div className="flex justify-between">
                          <p className="text-sm font-medium text-black">
                            {format(parseISO(post.scheduledAt), "h:mm a")}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              post.status === "posted"
                                ? "bg-green-100 text-green-800"
                                : post.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {post.status.charAt(0).toUpperCase() +
                              post.status.slice(1)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-900">
                          {post.content}
                        </p>
                        {post.imageUrl && (
                          <div className="mt-2">
                            <img
                              src={post.imageUrl}
                              alt="Post"
                              className="h-20 w-auto rounded object-cover"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-500">No upcoming posts scheduled</p>
              <button
                onClick={() => openCreatePostModal(new Date())}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusCircleIcon className="h-4 w-4 mr-1" /> Create a Post
              </button>
            </div>
          )}
        </div>
      )}

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        locationId={selectedLocation}
        onPostCreated={handleCreateSuccess}
      />
    </div>
  );
}
