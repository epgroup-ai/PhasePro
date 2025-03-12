import { useLocation, Link } from "wouter";

export default function NavigationTabs() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex -mb-px">
          <Link href="/">
            <button
              className={`border-b-2 px-4 py-4 text-sm font-medium ${
                isActive("/")
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={isActive("/") ? "page" : undefined}
            >
              Dashboard
            </button>
          </Link>
          <Link href="/new-enquiry">
            <button
              className={`border-b-2 px-4 py-4 text-sm font-medium ${
                isActive("/new-enquiry")
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={isActive("/new-enquiry") ? "page" : undefined}
            >
              New Enquiry
            </button>
          </Link>
          <Link href="/processed-enquiries">
            <button
              className={`border-b-2 px-4 py-4 text-sm font-medium ${
                isActive("/processed-enquiries")
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={isActive("/processed-enquiries") ? "page" : undefined}
            >
              Processed Enquiries
            </button>
          </Link>
          <Link href="/analytics">
            <button
              className={`border-b-2 px-4 py-4 text-sm font-medium ${
                isActive("/analytics")
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={isActive("/analytics") ? "page" : undefined}
            >
              Analytics
            </button>
          </Link>
          <Link href="/settings">
            <button
              className={`border-b-2 px-4 py-4 text-sm font-medium ${
                isActive("/settings")
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              aria-current={isActive("/settings") ? "page" : undefined}
            >
              Settings
            </button>
          </Link>
        </nav>
      </div>
    </div>
  );
}
