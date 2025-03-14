import { DashboardStats as DashboardStatsType } from "@shared/schema";
import { MailIcon, CheckCircleIcon, ClockIcon, GaugeIcon } from "lucide-react";

interface DashboardStatsProps {
  stats: DashboardStatsType;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  const statItems = [
    {
      title: "New Enquiries",
      value: (stats.newEnquiries ?? 0).toString(),
      icon: <MailIcon className="text-primary-600" />,
      bgColor: "bg-primary-100",
    },
    {
      title: "Processed Today",
      value: (stats.processedToday ?? 0).toString(),
      icon: <CheckCircleIcon className="text-success" />,
      bgColor: "bg-green-100",
    },
    {
      title: "Pending Review",
      value: (stats.pendingReview ?? 0).toString(),
      icon: <ClockIcon className="text-warning" />,
      bgColor: "bg-yellow-100",
    },
    {
      title: "Avg. Processing Time",
      value: stats.avgProcessingTime ?? "0 sec",
      icon: <GaugeIcon className="text-primary-600" />,
      bgColor: "bg-blue-100",
    },
  ];

  return (
    <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {statItems.map((item, index) => (
        <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${item.bgColor} rounded-md p-3`}>
                {item.icon}
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{item.title}</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
