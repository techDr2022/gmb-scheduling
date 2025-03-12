// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Calendar from "@/components/calendar/Calendar";
import LocationSelector from "@/components/locations/LocationSelector";
import PostsList from "@/components/posts/PostsList";
import DashboardStats from "@/components/dashboard/DashboardStats";
import { fetchLocations } from "@/services/locationService";
import { fetchAndStoreGMBLocations } from "@/services/gmbService";
import toast from "react-hot-toast";
import { Location } from "@/types/next-auth";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingGMB, setIsSyncingGMB] = useState<boolean>(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Remove the automatic GMB locations fetch useEffect

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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Manage your Google My Business posts across all locations
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {locations.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6 shadow-md">
            <h3 className="font-semibold text-amber-800 text-lg mb-2">
              No locations found
            </h3>
            <p className="text-amber-700 mb-4">
              {isSyncingGMB
                ? "We're syncing your GMB locations. This may take a moment..."
                : "No locations found. Please make sure you have location groups in your Google My Business account."}
            </p>
            {!isSyncingGMB && (
              <button
                onClick={handleRefreshLocations}
                disabled={isSyncingGMB}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="w-full md:w-auto">
                  <LocationSelector
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onLocationChange={setSelectedLocation}
                  />
                </div>

                <button
                  onClick={handleRefreshLocations}
                  disabled={isSyncingGMB}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors duration-200"
                >
                  <ArrowPathIcon
                    className={`mr-2 h-4 w-4 ${
                      isSyncingGMB ? "animate-spin" : ""
                    }`}
                  />
                  {isSyncingGMB ? "Refreshing..." : "Refresh Locations"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                {selectedLocation && (
                  <Calendar selectedLocation={selectedLocation} />
                )}
              </div>
              <div className="lg:col-span-4">
                {selectedLocation && (
                  <PostsList selectedLocation={selectedLocation} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
