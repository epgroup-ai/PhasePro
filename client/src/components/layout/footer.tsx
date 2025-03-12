import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} AI-Integrated Enquiry System - Phase 1
          </div>
          <div className="text-sm text-gray-500">
            <Link href="/help">
              <a className="text-gray-500 hover:text-gray-700 mr-4">Help</a>
            </Link>
            <Link href="/privacy">
              <a className="text-gray-500 hover:text-gray-700 mr-4">Privacy</a>
            </Link>
            <Link href="/terms">
              <a className="text-gray-500 hover:text-gray-700">Terms</a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
