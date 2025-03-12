"use client";

import { Location } from "@/types/next-auth";

interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: string | null;
  onLocationChange: (locationId: string) => void;
}

export default function LocationSelector({
  locations,
  selectedLocation,
  onLocationChange,
}: LocationSelectorProps) {
  if (!locations || locations.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
        <p className="text-sm text-yellow-700">
          No locations found. Please add a location first.
        </p>
      </div>
    );
  }

  console.log("locations", locations);

  return (
    <div className="max-w-xs">
      <label
        htmlFor="location"
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        Select Location
      </label>
      <div className="relative">
        <select
          id="location"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-black max-h-60 overflow-y-auto"
          value={selectedLocation || ""}
          onChange={(e) => onLocationChange(e.target.value)}
          style={{ maxHeight: "200px", overflowY: "auto" }}
        >
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
