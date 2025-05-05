"use client";

// app/reviews/reviews-client.tsx
import { useEffect, useState } from "react";
import { updateReply } from "@/services/reviewService";
import toast from "react-hot-toast";

interface Location {
  id: string;
  name: string;
}

interface Review {
  id: string;
  locationId: string;
  rating: number;
  comment?: string;
  name?: string;
  reply?: string;
  createdAt: string;
  gmbReviewId?: string;
  responded: boolean;
  location: {
    name: string;
    phoneNumber?: string;
  };
}

interface ReviewsClientProps {
  initialLocations: Location[];
  initialReviews: Review[];
  error: string | null;
}

export default function ReviewsClient({
  initialLocations,
  initialReviews,
  error,
}: ReviewsClientProps) {
  const [selectedLocationId, setSelectedLocationId] = useState("all");
  const [filteredReviews, setFilteredReviews] = useState(initialReviews);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReply, setEditReply] = useState("");

  // Filter reviews when location selection changes
  useEffect(() => {
    if (selectedLocationId === "all") {
      setFilteredReviews(initialReviews);
    } else {
      const filtered = initialReviews.filter(
        (review) => review.locationId === selectedLocationId
      );
      setFilteredReviews(filtered);
    }
  }, [selectedLocationId, initialReviews]);

  // Handle location filter change
  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLocationId(e.target.value);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Render star rating
  const renderStars = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  const handleUpdateReply = async (review: Review) => {
    if (!review.gmbReviewId) {
      toast.error("Cannot update reply: Missing review ID");
      return;
    }

    try {
      if (!review.name) {
        toast.error("Cannot update reply: Missing review name");
        return;
      }
      await updateReply(review.id, editReply, review.name);

      // Update local state
      const updatedReviews = initialReviews.map((r) =>
        r.id === review.id ? { ...r, reply: editReply } : r
      );
      setFilteredReviews(
        selectedLocationId === "all"
          ? updatedReviews
          : updatedReviews.filter((r) => r.locationId === selectedLocationId)
      );

      setEditingReplyId(null);
      toast.success("Reply updated successfully");
    } catch (error) {
      console.error("Error updating reply:", error);
      toast.error("Failed to update reply");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div
            className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded"
            role="alert"
          >
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Reviews by Location
          </h1>

          {/* Location filter */}
          <div className="mb-8">
            <label
              htmlFor="location-filter"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Filter by Location
            </label>
            <select
              id="location-filter"
              value={selectedLocationId}
              onChange={handleLocationChange}
              className="block w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-black"
            >
              <option value="all">All Locations</option>
              {initialLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reviews count */}
          <p className="text-gray-600 mb-4">
            Showing {filteredReviews.length}{" "}
            {filteredReviews.length === 1 ? "review" : "reviews"}
          </p>

          {/* Reviews list */}
          {filteredReviews.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">
                No reviews found for this location.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white shadow rounded-lg overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {review.location.name}
                        </h3>
                        <div className="mt-1 text-yellow-400 text-xl">
                          {renderStars(review.rating)}
                          <span className="text-gray-500 text-sm ml-2">
                            ({review.rating}/5)
                          </span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>

                    {review.comment && (
                      <div className="mt-4">
                        <p className="text-gray-700">{review.comment}</p>
                      </div>
                    )}

                    <div className="mt-4 pl-4 border-l-4 border-gray-200">
                      {editingReplyId === review.id ? (
                        <div>
                          <textarea
                            value={editReply}
                            onChange={(e) => setEditReply(e.target.value)}
                            className="w-full p-2 border rounded text-gray-900"
                            rows={3}
                            placeholder="Enter your reply..."
                          />
                          <div className="mt-2 flex justify-end space-x-2">
                            <button
                              onClick={() => setEditingReplyId(null)}
                              className="px-3 py-1 text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleUpdateReply(review)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Save Reply
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-500 mb-1">
                            Our Response:
                          </p>
                          <p className="text-gray-700">
                            {review.reply || "No reply yet"}
                          </p>
                          <button
                            onClick={() => {
                              setEditingReplyId(review.id);
                              setEditReply(review.reply || "");
                            }}
                            className="mt-2 text-blue-600 hover:text-blue-800"
                          >
                            {review.reply ? "Edit Reply" : "Add Reply"}
                          </button>
                        </>
                      )}
                    </div>

                    <div className="mt-4 flex justify-between text-sm">
                      <span className="text-gray-500">
                        Review ID: {review.gmbReviewId || "N/A"}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full ${
                          review.responded
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {review.responded ? "Responded" : "Needs Response"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
