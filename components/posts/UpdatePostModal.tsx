"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  XMarkIcon,
  PhotoIcon,
  CalendarIcon,
  LinkIcon,
  DocumentTextIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { updatePost } from "@/services/postService";
import { uploadImage } from "@/services/uploadService";
import toast from "react-hot-toast";
import { Post } from "@/types/next-auth";

interface UpdatePostModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated?: (post: Post) => void;
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

export default function UpdatePostModal({
  post,
  isOpen,
  onClose,
  onPostUpdated,
}: UpdatePostModalProps) {
  const [content, setContent] = useState<string>(post.content);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(post.imageUrl || "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [charCount, setCharCount] = useState<number>(post.content.length);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [ctaType, setCtaType] = useState<string>(post.ctaType || "");
  const [ctaUrl, setCtaUrl] = useState<string>(post.ctaUrl || "");
  const [activeTab, setActiveTab] = useState<string>("content");

  // Parse the scheduled date and time
  const scheduledDate = parseISO(post.scheduledAt);
  const formattedDate = format(scheduledDate, "yyyy-MM-dd");
  const formattedTime = format(scheduledDate, "HH:mm");

  const [dateValue, setDateValue] = useState<string>(formattedDate);
  const [timeValue, setTimeValue] = useState<string>(formattedTime);

  // Reset data when post changes
  useEffect(() => {
    if (post && isOpen) {
      setContent(post.content);
      setCharCount(post.content.length);
      setImagePreview(post.imageUrl || "");
      setImageFile(null);
      setCtaType(post.ctaType || "");
      setCtaUrl(post.ctaUrl || "");

      const scheduledDate = parseISO(post.scheduledAt);
      setDateValue(format(scheduledDate, "yyyy-MM-dd"));
      setTimeValue(format(scheduledDate, "HH:mm"));

      setFormErrors({});
      setActiveTab("content");
    }
  }, [post, isOpen]);

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
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors({ ...formErrors, image: "Image size cannot exceed 5MB" });
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

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
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

      // Upload image if a new one was selected
      let imageUrl = imagePreview;
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

      // Update post
      const updatedPost = await updatePost(post.id, {
        content,
        imageUrl: imageUrl || undefined,
        scheduledAt: scheduledAt.toISOString(),
        ctaType: ctaType || undefined,
        ctaUrl: ctaUrl || undefined,
      });

      toast.success("Post updated successfully!");
      if (onPostUpdated) {
        onPostUpdated(updatedPost);
      }
      onClose();
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gradient-to-r from-amber-500 to-orange-600">
          <h3 className="text-xl font-bold text-white flex items-center">
            <PencilIcon className="h-5 w-5 mr-2" />
            Edit Scheduled Post
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
              activeTab === "content"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("content")}
          >
            <div className="flex items-center justify-center">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Content
            </div>
          </button>
          <button
            className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
              activeTab === "media"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("media")}
          >
            <div className="flex items-center justify-center">
              <PhotoIcon className="h-5 w-5 mr-2" />
              Media
            </div>
          </button>
          <button
            className={`flex-1 py-3 px-4 font-medium text-sm transition-colors ${
              activeTab === "cta"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("cta")}
          >
            <div className="flex items-center justify-center">
              <LinkIcon className="h-5 w-5 mr-2" />
              Button
            </div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Tab content */}
          <div className={activeTab === "content" ? "block" : "hidden"}>
            <div className="grid grid-cols-2 gap-4 mb-4">
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
                  } py-2 px-3 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm text-black`}
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
                  } py-2 px-3 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm text-black`}
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  required
                />
                {formErrors.time && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.time}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700"
              >
                Post Content
              </label>
              <textarea
                id="content"
                rows={6}
                className={`mt-1 block w-full rounded-md border ${
                  formErrors.content ? "border-red-300" : "border-gray-300"
                } py-2 px-3 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm text-black`}
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

          <div className={activeTab === "media" ? "block" : "hidden"}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Image (Optional)
              </label>

              {!imagePreview ? (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50">
                  <div className="space-y-2 text-center">
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-700 justify-center">
                      <label
                        htmlFor="image"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-orange-500 px-4 py-2 shadow-sm border border-gray-300"
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
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-2 relative rounded-md overflow-hidden shadow-md">
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
              )}

              {formErrors.image && (
                <p className="mt-1 text-sm text-red-600">{formErrors.image}</p>
              )}
            </div>
          </div>

          <div className={activeTab === "cta" ? "block" : "hidden"}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="ctaType"
                  className="block text-sm font-medium text-gray-700"
                >
                  Call to Action Button (Optional)
                </label>
                <select
                  id="ctaType"
                  value={ctaType}
                  onChange={(e) => setCtaType(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm text-black"
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
                    } py-2 px-3 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm text-black`}
                  />
                  {formErrors.ctaUrl && (
                    <p className="mt-1 text-sm text-red-600">
                      {formErrors.ctaUrl}
                    </p>
                  )}
                </div>
              )}

              {ctaType === "CALL" && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="flex items-center text-sm text-gray-600">
                    <CalendarIcon className="h-5 w-5 mr-2 text-gray-400" />
                    <p>
                      {
                        "The Call now button will use the phone number associated with your Google Business Profile. No URL is required."
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(formErrors).length > 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploadingImage
                ? "Uploading image..."
                : isSubmitting
                ? "Updating..."
                : "Update Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
