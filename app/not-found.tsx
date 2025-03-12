import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <h1 className="text-6xl font-bold text-blue-600">404</h1>
      <h2 className="text-2xl font-medium text-gray-800 mt-3">
        Page Not Found
      </h2>
      <p className="text-gray-600 mt-4">
        {"The page you are looking for doesn't exist or has been moved."}
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
      >
        Go back home
      </Link>
    </div>
  );
}
