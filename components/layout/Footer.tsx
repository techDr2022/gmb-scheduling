export default function Footer() {
  return (
    <footer className="bg-white">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 border-t">
        <p className="text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} GMB Post Scheduler. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
