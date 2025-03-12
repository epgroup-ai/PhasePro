import { useQuery } from "@tanstack/react-query";
import DashboardStats from "@/components/dashboard/stats";
import { DashboardStats as DashboardStatsType } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery<DashboardStatsType>({
    queryKey: ['/api/stats'],
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of the enquiry processing system</p>
        </div>
        <Link href="/new-enquiry">
          <Button className="flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            New Enquiry
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white overflow-hidden shadow rounded-lg p-6">
              <div className="animate-pulse flex items-center">
                <div className="flex-shrink-0 bg-gray-200 h-12 w-12 rounded-md"></div>
                <div className="ml-5 w-full">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="mt-3 h-6 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 text-red-700">
          Failed to load dashboard statistics. Please try refreshing the page.
        </div>
      ) : stats ? (
        <DashboardStats stats={stats} />
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Enquiries</h2>
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">ENQ-2023-0042</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">ABC Packaging Ltd.</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Processed
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Today</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 text-right">
            <Link href="/processed-enquiries">
              <Button variant="outline" size="sm">View All Enquiries</Button>
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/new-enquiry">
              <Button className="w-full h-24 flex flex-col items-center justify-center" variant="outline">
                <PlusIcon className="h-6 w-6 mb-2" />
                <span>Process New Enquiry</span>
              </Button>
            </Link>
            <Link href="/processed-enquiries">
              <Button className="w-full h-24 flex flex-col items-center justify-center" variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>View Spec Sheets</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button className="w-full h-24 flex flex-col items-center justify-center" variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>System Settings</span>
              </Button>
            </Link>
            <Link href="/analytics">
              <Button className="w-full h-24 flex flex-col items-center justify-center" variant="outline">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>View Analytics</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
