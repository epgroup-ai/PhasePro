import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-primary-600 rounded-md flex items-center justify-center text-white font-bold">
                P1
              </div>
            </div>
            <div className="ml-4">
              <h1 className="text-xl font-semibold text-gray-900">AI-Integrated Enquiry System</h1>
              <p className="text-sm text-gray-500">Phase 1: Enquiry Processing</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                type="button" 
                className="text-gray-500 hover:text-gray-700"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
              </button>
            </div>
            <div className="flex items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User avatar" />
                <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <span className="ml-2 text-sm font-medium text-gray-700">John Smith</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
