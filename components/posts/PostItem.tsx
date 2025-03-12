// File: src/components/posts/PostItem.tsx
"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { TrashIcon, PencilIcon, ClockIcon } from "@heroicons/react/24/outline";
import UpdatePostModal from "./UpdatePostModal";
import { Post } from "@/types/next-auth";

interface PostItemProps {
  post: Post;
  onDelete: (postId: string) => void;
}

export default function PostItem({ post, onDelete }: PostItemProps) {
  const [showUpdateModal, setShowUpdateModal] = useState<boolean>(false);

  const statusColors = {
    scheduled: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      icon: "text-blue-600",
    },
    posted: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: "text-green-600",
    },
    failed: {
      bg: "bg-red-100",
      text: "text-red-800",
      icon: "text-red-600",
    },
  };

  const formatDate = (dateString: string): string => {
    const date = parseISO(dateString);
    return format(date, "MMM d, yyyy h:mm a");
  };

  const confirmDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      onDelete(post.id);
    }
  };

  return (
    <>
      <div className="p-4 hover:bg-gray-50 transition-colors duration-200">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {post.content.substring(0, 50)}
              {post.content.length > 50 ? "..." : ""}
            </p>
            <p className="text-xs text-gray-500 mt-1 flex items-center">
              <ClockIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
              {formatDate(post.scheduledAt)}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                statusColors[post.status].bg
              } ${statusColors[post.status].text}`}
            >
              {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
            </span>

            {post.status === "scheduled" && (
              <>
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className={`p-1 rounded-full hover:bg-blue-50 ${
                    statusColors[post.status].icon
                  }`}
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={confirmDelete}
                  className="p-1 rounded-full hover:bg-red-50 text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {post.imageUrl && (
          <div className="mt-2">
            <img
              src={post.imageUrl}
              alt="Post"
              className="h-24 w-auto rounded-md shadow-sm object-cover"
            />
          </div>
        )}
      </div>

      {showUpdateModal && (
        <UpdatePostModal
          post={post}
          isOpen={showUpdateModal}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </>
  );
}
