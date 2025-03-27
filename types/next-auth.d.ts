// File: src/types/index.ts
export interface Location {
  id: string;
  gmbLocationId: string;
  address: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  locationId: string;
  content: string;
  imageUrl?: string | null;
  scheduledAt: string;
  status: "scheduled" | "posted" | "failed";
  ctaType?: string | null;
  ctaUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostFormData {
  locationId: string;
  content: string;
  imageUrl?: string;
  scheduledAt: string;
  ctaType?: string;
  ctaUrl?: string;
}

export interface UploadResponse {
  fileUrl: string;
}
