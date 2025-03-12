import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell 
} from "recharts";

// Sample data for charts - in a real app this would come from an API
const processingTimeData = [
  { name: 'Week 1', avgTime: 2.8 },
  { name: 'Week 2', avgTime: 2.5 },
  { name: 'Week 3', avgTime: 1.9 },
  { name: 'Week 4', avgTime: 1.5 },
];

const enquiryVolumeData = [
  { name: 'Mon', count: 12 },
  { name: 'Tue', count: 19 },
  { name: 'Wed', count: 14 },
  { name: 'Thu', count: 21 },
  { name: 'Fri', count: 25 },
];

const productTypeData = [
  { name: 'Cardboard Boxes', value: 45 },
  { name: 'Labels', value: 28 },
  { name: 'Folding Cartons', value: 17 },
  { name: 'Other', value: 10 },
];

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export default function Analytics() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500">Insights and trends from the enquiry processing system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Average Processing Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={processingTimeData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="name" />
                <YAxis 
                  label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} 
                  domain={[0, 'dataMax + 1']} 
                />
                <Tooltip formatter={(value) => [`${value} min`, 'Avg. Time']} />
                <Legend />
                <Line 
                  type="monotone"
                  dataKey="avgTime"
                  name="Average Processing Time"
                  stroke="#3b82f6"
                  activeDot={{ r: 8 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Processing time has decreased by 46% over the last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enquiry Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={enquiryVolumeData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value} enquiries`, 'Volume']} />
                <Legend />
                <Bar dataKey="count" name="Enquiries Received" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Friday has the highest volume of enquiries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {productTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Cardboard boxes are the most common product type
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Confidence Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Customer Information</span>
                  <span className="font-medium">96%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full" style={{ width: '96%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Product Dimensions</span>
                  <span className="font-medium">94%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Material Types</span>
                  <span className="font-medium">87%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Print Specifications</span>
                  <span className="font-medium">83%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full" style={{ width: '83%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span>Special Instructions</span>
                  <span className="font-medium">78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">
              AI performs best on structured data extraction
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
