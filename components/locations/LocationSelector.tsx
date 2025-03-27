// src/components/locations/LocationSelector.tsx
import React from "react";
import { Location } from "@/types/next-auth";

interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: string | null;
  onLocationChange: (locationId: string) => void;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations,
  selectedLocation,
  onLocationChange,
}) => {
  // Handle selection change
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLocationChange(e.target.value);
  };

  return (
    <div className="w-full">
      <label htmlFor="location-select" className="sr-only">
        Select location
      </label>
      <select
        id="location-select"
        className="block w-full py-2 px-3 border border-gray-300 bg-white text-black rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        value={selectedLocation || ""}
        onChange={handleChange}
      >
        {locations.length === 0 ? (
          <option value="" disabled>
            No locations available
          </option>
        ) : (
          <>
            <option value="" disabled>
              Select a location
            </option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
};

export default LocationSelector;
