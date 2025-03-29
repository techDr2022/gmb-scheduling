"use client";

import { useState, useEffect } from "react";
import { format, addMinutes, setHours, setMinutes } from "date-fns";
import {
  XMarkIcon,
  PhotoIcon,
  CalendarIcon,
  LinkIcon,
  DocumentTextIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { createPost } from "@/services/postService";
import { uploadImage } from "@/services/uploadService";
import toast from "react-hot-toast";
import { Post } from "@/types/next-auth";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  locationId: string;
  onPostCreated: (post: Post) => void;
}

const CALL_TO_ACTION_OPTIONS = [
  { label: "None", value: "" },
  { label: "Learn more", value: "LEARN_MORE" },
  { label: "Book", value: "BOOK" },
  { label: "Order online", value: "ORDER" },
  { label: "Buy", value: "BUY" },
  { label: "Sign up", value: "SIGN_UP" },
  { label: "Call now", value: "CALL" },
];

export default function CreatePostModal({
  isOpen,
  onClose,
  selectedDate = null,
  locationId,
  onPostCreated,
}: CreatePostModalProps) {
  const [content, setContent] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [charCount, setCharCount] = useState<number>(0);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [ctaType, setCtaType] = useState<string>("");
  const [ctaUrl, setCtaUrl] = useState<string>("");
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] =
    useState<boolean>(false);

  // Calculate a reasonable default time (rounded to next 15 minutes)
  const now = new Date();
  const defaultTime = addMinutes(
    setMinutes(
      setHours(now, now.getHours()),
      Math.ceil(now.getMinutes() / 15) * 15
    ),
    selectedDate && selectedDate.getDate() !== now.getDate() ? 9 * 60 : 0
  );
  const [timeValue, setTimeValue] = useState<string>(
    format(defaultTime, "HH:mm")
  );

  // Set default date if it's null
  const effectiveDate = selectedDate || now;
  const formattedDate = format(effectiveDate, "yyyy-MM-dd");
  const [dateValue, setDateValue] = useState<string>(formattedDate);

  useEffect(() => {
    // Reset form when modal opens
    if (isOpen) {
      setContent("");
      setImageFile(null);
      setImagePreview("");
      setCharCount(0);
      setFormErrors({});
      setCtaType("");
      setCtaUrl("");

      if (selectedDate) {
        setDateValue(format(selectedDate, "yyyy-MM-dd"));
        // If selected date is today, use next rounded time, otherwise default to 9am
        if (selectedDate.getDate() === now.getDate()) {
          setTimeValue(format(defaultTime, "HH:mm"));
        } else {
          setTimeValue("09:00");
        }
      }
    }
  }, [isOpen, selectedDate]);

  // Clear URL if CTA type is changed to CALL
  useEffect(() => {
    if (ctaType === "CALL") {
      setCtaUrl("");
    }
  }, [ctaType]);

  // Update character count when content changes
  useEffect(() => {
    setCharCount(content.length);

    // Validate content length
    if (content.length > 1500) {
      setFormErrors({
        ...formErrors,
        content: "Content cannot exceed 1500 characters",
      });
    } else if (content.length === 0) {
      setFormErrors({ ...formErrors, content: "Content is required" });
    } else {
      const newErrors = { ...formErrors };
      delete newErrors.content;
      setFormErrors(newErrors);
    }
  }, [content]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setFormErrors({
          ...formErrors,
          image: "Image size cannot exceed 10MB",
        });
        return;
      }

      // Validate file type
      if (!file.type.match("image/jpeg|image/png|image/gif")) {
        setFormErrors({
          ...formErrors,
          image: "Only JPG, PNG, and GIF images are allowed",
        });
        return;
      }

      // Clear any previous image errors
      const newErrors = { ...formErrors };
      delete newErrors.image;
      setFormErrors(newErrors);

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // Validate content
    if (content.trim().length === 0) {
      errors.content = "Content is required";
    } else if (content.length > 1500) {
      errors.content = "Content cannot exceed 1500 characters";
    }

    // Validate date and time
    const scheduledAt = new Date(`${dateValue}T${timeValue}`);
    if (scheduledAt < new Date()) {
      errors.time = "Scheduled time must be in the future";
    }

    // Validate CTA URL if CTA type is selected (except for "CALL" type)
    if (ctaType && ctaType !== "CALL" && !ctaUrl) {
      errors.ctaUrl = "URL is required when a call-to-action is selected";
    } else if (ctaUrl && !ctaUrl.match(/^(https?:\/\/)/)) {
      errors.ctaUrl = "URL must start with http:// or https://";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine date and time
      const [hours, minutes] = timeValue.split(":");
      const scheduledAt = new Date(dateValue);
      scheduledAt.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0);

      // Upload image if exists
      let imageUrl = null;
      if (imageFile) {
        try {
          setIsUploadingImage(true);
          const uploadResult = await uploadImage(imageFile);
          imageUrl = uploadResult.fileUrl;
        } catch (error) {
          console.error("Error uploading image:", error);
          toast.error("Failed to upload image. Please try again.");
          setIsSubmitting(false);
          setIsUploadingImage(false);
          return;
        } finally {
          setIsUploadingImage(false);
        }
      }

      // Create post
      const newPost = await createPost({
        locationId,
        content,
        imageUrl: imageUrl || undefined,
        scheduledAt: scheduledAt.toISOString(),
        ctaType: ctaType || undefined,
        ctaUrl: ctaUrl || undefined,
      });

      toast.success("Post scheduled successfully!");
      onPostCreated(newPost);
      onClose();
    } catch (error) {
      console.error("Error scheduling post:", error);
      toast.error("Failed to schedule post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  // Function to generate AI suggestions based on the image
  const generateAISuggestion = async () => {
    if (!imageFile) {
      toast.error("Please upload an image first to get content suggestions");
      return;
    }

    setIsGeneratingSuggestion(true);

    try {
      // First upload the image to get a URL
      const uploadResult = await uploadImage(imageFile);
      const imageUrl = uploadResult.fileUrl;

      // Send the image URL to our AI suggestion endpoint
      const response = await fetch("/api/ai-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          ctaType: ctaType || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content suggestion");
      }

      const data = await response.json();

      // Update content with AI suggestion
      setContent(data.suggestion);
      toast.success("AI suggestion generated!");
    } catch (error) {
      console.error("Error generating AI suggestion:", error);
      toast.error("Failed to generate suggestion. Please try again.");
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 sticky top-0 z-10">
          <h3 className="text-xl font-bold text-white flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Create Post for{" "}
            {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Today"}
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* Schedule Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-base font-medium text-gray-900 mb-3 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
              Schedule
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Date
                </label>
                <input
                  type="date"
                  id="date"
                  className={`mt-1 block w-full rounded-md border ${
                    formErrors.time ? "border-red-300" : "border-gray-300"
                  } py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm text-black`}
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="time"
                  className="block text-sm font-medium text-gray-700"
                >
                  Time
                </label>
                <input
                  type="time"
                  id="time"
                  className={`mt-1 block w-full rounded-md border ${
                    formErrors.time ? "border-red-300" : "border-gray-300"
                  } py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm text-black`}
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  required
                />
                {formErrors.time && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.time}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-base font-medium text-gray-900 mb-3 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
              Content
            </h4>

            <div>
              <textarea
                id="content"
                rows={5}
                className={`block w-full rounded-md border ${
                  formErrors.content ? "border-red-300" : "border-gray-300"
                } py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm text-black`}
                placeholder="Share news, offers, or updates about your business..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={1500}
                required
              />
              <div className="mt-1 flex justify-between">
                <p
                  className={`text-sm ${
                    charCount > 1450
                      ? charCount > 1500
                        ? "text-red-600"
                        : "text-amber-600"
                      : "text-gray-500"
                  }`}
                >
                  {charCount}/1500 characters
                </p>
                {formErrors.content && (
                  <p className="text-sm text-red-600">{formErrors.content}</p>
                )}
              </div>
            </div>
          </div>

          {/* Media Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-base font-medium text-gray-900 mb-3 flex items-center">
              <PhotoIcon className="h-5 w-5 mr-2 text-blue-600" />
              Media
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Image (Optional)
              </label>

              {!imagePreview ? (
                <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50">
                  <div className="space-y-2 text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-700 justify-center">
                      <label
                        htmlFor="image"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-4 py-2 shadow-sm border border-gray-300"
                      >
                        <span>Choose file</span>
                        <input
                          id="image"
                          name="image"
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-md overflow-hidden shadow-md">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-64 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 rounded-full text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-lg"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {/* AI Suggestion Button */}
                  <button
                    type="button"
                    onClick={generateAISuggestion}
                    disabled={isGeneratingSuggestion}
                    className="flex items-center justify-center w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    {isGeneratingSuggestion
                      ? "Generating..."
                      : "Generate AI Content Suggestion"}
                  </button>
                </div>
              )}

              {formErrors.image && (
                <p className="mt-1 text-sm text-red-600">{formErrors.image}</p>
              )}
            </div>
          </div>

          {/* CTA Button Section */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="text-base font-medium text-gray-900 mb-3 flex items-center">
              <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
              Call-to-Action Button
            </h4>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ctaType"
                  className="block text-sm font-medium text-gray-700"
                >
                  Button Type (Optional)
                </label>
                <select
                  id="ctaType"
                  value={ctaType}
                  onChange={(e) => setCtaType(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm text-black"
                >
                  {CALL_TO_ACTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {ctaType && ctaType !== "CALL" && (
                <div>
                  <label
                    htmlFor="ctaUrl"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Button URL
                  </label>
                  <input
                    type="url"
                    id="ctaUrl"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://example.com/page"
                    className={`mt-1 block w-full rounded-md border ${
                      formErrors.ctaUrl ? "border-red-300" : "border-gray-300"
                    } py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm text-black`}
                  />
                  {formErrors.ctaUrl && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.ctaUrl}
                    </p>
                  )}
                </div>
              )}

              {ctaType === "CALL" && (
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                    <p>
                      {
                        'The "Call now" button will use the phone number associated with your Google Business Profile. No URL is required.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 sticky bottom-0 bg-white pb-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(formErrors).length > 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingImage
                ? "Uploading image..."
                : isSubmitting
                ? "Scheduling..."
                : "Schedule Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
