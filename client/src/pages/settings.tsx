import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    setIsLoading(true);
    
    // Simulate saving settings
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully",
      });
    }, 1000);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure the AI-Integrated Enquiry System</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure basic system settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" defaultValue="AI-Integrated Enquiry System" />
              </div>
              
              <div>
                <Label htmlFor="defaultDeadline">Default Response Time (days)</Label>
                <Input id="defaultDeadline" type="number" defaultValue="7" />
                <p className="mt-1 text-sm text-gray-500">
                  Set the default response time for new enquiries
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoProcess">Auto-Process Enquiries</Label>
                  <p className="text-sm text-gray-500">
                    Automatically process enquiries when uploaded
                  </p>
                </div>
                <Switch id="autoProcess" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="darkMode">Dark Mode</Label>
                  <p className="text-sm text-gray-500">
                    Enable dark mode for the application interface
                  </p>
                </div>
                <Switch id="darkMode" />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" className="mr-2">Reset</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>Configure AI extraction parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="apiKey">OpenAI API Key</Label>
                <Input id="apiKey" type="password" defaultValue="••••••••••••••••••••••" />
                <p className="mt-1 text-sm text-gray-500">
                  Your OpenAI API key for document processing
                </p>
              </div>
              
              <div>
                <Label htmlFor="model">AI Model</Label>
                <select
                  id="model"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue="gpt-4o"
                >
                  <option value="gpt-4o">GPT-4o (Recommended)</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Select the AI model to use for text extraction
                </p>
              </div>
              
              <div>
                <Label htmlFor="confidenceThreshold">Confidence Threshold (%)</Label>
                <Input id="confidenceThreshold" type="number" defaultValue="80" min="0" max="100" />
                <p className="mt-1 text-sm text-gray-500">
                  Flag items for review if AI confidence is below this threshold
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="advancedExtraction">Advanced Extraction</Label>
                  <p className="text-sm text-gray-500">
                    Enable more detailed extraction (slower but more accurate)
                  </p>
                </div>
                <Switch id="advancedExtraction" defaultChecked />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" className="mr-2">Reset</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure who receives notifications and when</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifs">Email Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Send email notifications for new enquiries
                  </p>
                </div>
                <Switch id="emailNotifs" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="processedNotifs">Processed Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Send notifications when enquiries are processed
                  </p>
                </div>
                <Switch id="processedNotifs" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="errorNotifs">Error Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Send notifications for processing errors
                  </p>
                </div>
                <Switch id="errorNotifs" defaultChecked />
              </div>
              
              <div>
                <Label htmlFor="notificationEmail">Notification Email</Label>
                <Input id="notificationEmail" type="email" defaultValue="admin@example.com" />
                <p className="mt-1 text-sm text-gray-500">
                  Email address to receive system notifications
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" className="mr-2">Reset</Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Admin User</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">admin@example.com</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Administrator</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Category Manager</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">manager@example.com</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Manager</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button variant="ghost" size="sm">Edit</Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button variant="outline">Add User</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
