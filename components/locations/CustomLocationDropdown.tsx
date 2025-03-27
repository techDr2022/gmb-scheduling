// src/components/locations/CustomLocationDropdown.tsx
import React, { useState, useRef, useEffect } from "react";
import { Location } from "@/types/next-auth";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

interface CustomLocationDropdownProps {
  locations: Location[];
  selectedLocation: string | null;
  onLocationChange: (locationId: string) => void;
  isSearching: boolean;
}

const CustomLocationDropdown: React.FC<CustomLocationDropdownProps> = ({
  locations,
  selectedLocation,
  onLocationChange,
  isSearching,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find the selected location object
  const selectedLocationObject =
    locations.find((loc) => loc.id === selectedLocation) || null;

  // Open dropdown automatically when searching or when locations change during search
  useEffect(() => {
    if (isSearching) {
      setIsOpen(true);
    }
  }, [isSearching, locations]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle location selection
  const handleSelectLocation = (locationId: string) => {
    onLocationChange(locationId);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown button */}
      <div
        className={`flex items-center justify-between w-full px-3 py-2 text-black bg-white border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 sm:text-sm ${
          isOpen ? "ring-2 ring-blue-500 border-blue-500" : ""
        }`}
        onClick={() => !isSearching && setIsOpen(!isOpen)}
      >
        <span className="block truncate">
          {selectedLocationObject
            ? selectedLocationObject.name
            : "Select a location"}
        </span>
        <ChevronDownIcon
          className={`w-5 h-5 ml-2 text-gray-400 ${
            isOpen ? "transform rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Dropdown menu - always visible during search */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto focus:outline-none">
          <ul role="listbox" tabIndex={-1} className="py-1">
            {locations.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-500">
                No locations available
              </li>
            ) : (
              locations.map((location) => (
                <li
                  key={location.id}
                  role="option"
                  className={`cursor-pointer select-none relative px-3 py-2 text-sm hover:bg-blue-100 ${
                    location.id === selectedLocation
                      ? "bg-blue-50 font-medium text-blue-600"
                      : "text-gray-900"
                  }`}
                  aria-selected={location.id === selectedLocation}
                  onClick={() => handleSelectLocation(location.id)}
                >
                  <span className="block truncate">{location.name}</span>
                  {location.address && (
                    <span className="block truncate text-xs text-gray-500">
                      {location.address}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomLocationDropdown;
