// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Calendar from "@/components/calendar/Calendar";
import CustomLocationDropdown from "@/components/locations/CustomLocationDropdown";
import PostsList from "@/components/posts/PostsList";
import DashboardStats from "@/components/dashboard/DashboardStats";
import { fetchLocations } from "@/services/locationService";
import { fetchAndStoreGMBLocations } from "@/services/gmbService";
import toast from "react-hot-toast";
import { Location } from "@/types/next-auth";
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

// Google My Business icon SVG component
const GMBIcon = ({ className = "h-5 w-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingGMB, setIsSyncingGMB] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Load locations from database
  useEffect(() => {
    async function loadLocations() {
      if (status === "authenticated") {
        try {
          const locationsData = await fetchLocations();
          setLocations(locationsData);
          if (locationsData.length > 0) {
            setSelectedLocation(locationsData[0].id);
          }
        } catch (error) {
          console.error("Failed to load locations:", error);
          toast.error("Failed to load locations");
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadLocations();
  }, [status, isSyncingGMB]);

  // Filter locations based on search query
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;

    return locations.filter((location) =>
      location.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [locations, searchQuery]);

  // Handle search input changes

  // Function to handle GMB location refresh
  const handleRefreshLocations = async () => {
    if (!session) return;

    setIsSyncingGMB(true);
    try {
      await fetchAndStoreGMBLocations(session);
      toast.success("GMB locations synced successfully");

      // Fetch updated locations after sync
      const updatedLocations = await fetchLocations();
      setLocations(updatedLocations);

      if (updatedLocations.length > 0 && !selectedLocation) {
        setSelectedLocation(updatedLocations[0].id);
      }
    } catch (error) {
      console.error("Failed to sync GMB locations:", error);
      toast.error("Failed to sync GMB locations");
    } finally {
      setIsSyncingGMB(false);
    }
  };

  // Clear search query
  const clearSearch = () => {
    setSearchQuery("");
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-12">
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-3">
            <GMBIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">
                Manage your Google My Business posts across all locations
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {locations.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 shadow-md">
            <div className="flex items-center space-x-3">
              <GMBIcon className="h-6 w-6 text-amber-600" />
              <h3 className="font-semibold text-amber-800 text-lg">
                No locations found
              </h3>
            </div>
            <p className="text-amber-700 mb-4 mt-2">
              {isSyncingGMB
                ? "We're syncing your GMB locations. This may take a moment..."
                : "No locations found. Please make sure you have location groups in your Google My Business account."}
            </p>
            {!isSyncingGMB && (
              <button
                onClick={handleRefreshLocations}
                disabled={isSyncingGMB}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 transition-all duration-200"
              >
                <ArrowPathIcon className="mr-2 h-4 w-4" />
                Try Syncing Now
              </button>
            )}
          </div>
        ) : (
          <>
            <DashboardStats selectedLocation={selectedLocation} />

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                {/* Search bar - full width on mobile, 1/3 on larger screens */}
                <div className="relative lg:col-span-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Search locations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>

                {/* Location selector - full width on mobile, 1/3 on larger screens */}
                <div className="lg:col-span-1">
                  <CustomLocationDropdown
                    locations={filteredLocations}
                    selectedLocation={selectedLocation}
                    onLocationChange={(locationId) => {
                      setSelectedLocation(locationId);
                      // Clear search after selection for better UX
                      setSearchQuery("");
                    }}
                    isSearching={searchQuery.length > 0}
                  />
                  {searchQuery && filteredLocations.length === 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      No locations match your search
                    </p>
                  )}
                </div>

                {/* Refresh button - full width on mobile, 1/3 on larger screens, right-aligned */}
                <div className="lg:col-span-1 flex justify-start lg:justify-end">
                  <button
                    onClick={handleRefreshLocations}
                    disabled={isSyncingGMB}
                    className="inline-flex w-full lg:w-auto items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
                  >
                    <GMBIcon className="mr-2 h-4 w-4" />
                    {!isSyncingGMB && (
                      <ArrowPathIcon className="mr-2 h-4 w-4" />
                    )}
                    {isSyncingGMB && (
                      <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSyncingGMB ? "Refreshing..." : "Refresh GMB Locations"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                {selectedLocation && (
                  <Calendar selectedLocation={selectedLocation} />
                )}
                {!selectedLocation && (
                  <div className="h-64 bg-white rounded-lg shadow-md flex items-center justify-center">
                    <p className="text-gray-500">
                      {filteredLocations.length === 0
                        ? "No locations match your search criteria"
                        : "Please select a location to view the calendar"}
                    </p>
                  </div>
                )}
              </div>
              <div className="lg:col-span-4">
                {selectedLocation && (
                  <PostsList selectedLocation={selectedLocation} />
                )}
                {!selectedLocation && (
                  <div className="h-64 bg-white rounded-lg shadow-md flex items-center justify-center">
                    <p className="text-gray-500">
                      Select a location to view posts
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
