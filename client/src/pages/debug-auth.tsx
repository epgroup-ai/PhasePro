import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function DebugAuthPage() {
  const { user, isLoading, loginMutation, refetchUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [debugResponse, setDebugResponse] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  // Test session status
  const checkSessionStatus = async () => {
    try {
      setSessionLoading(true);
      console.log("Checking session status...");
      const res = await fetch('/api/test', { credentials: 'include' });
      const data = await res.json();
      console.log("Session test result:", data);
      setSessionStatus(data);
      return data;
    } catch (error) {
      console.error("Session test error:", error);
      setSessionStatus({ error: String(error) });
      return { error: String(error) };
    } finally {
      setSessionLoading(false);
    }
  };

  // Create debug user if needed
  const createDebugUser = async () => {
    try {
      setDebugLoading(true);
      console.log("Creating debug user...");
      const res = await fetch('/api/test/create-user', { credentials: 'include' });
      const data = await res.json();
      console.log("Debug user creation result:", data);
      setDebugResponse(data);
      
      toast({
        title: data.success ? "Success" : "Error",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      
      return data;
    } catch (error) {
      console.error("Debug user creation error:", error);
      setDebugResponse({ error: String(error) });
      
      toast({
        title: "Error",
        description: `Failed to create debug user: ${String(error)}`,
        variant: "destructive",
      });
      
      return { error: String(error) };
    } finally {
      setDebugLoading(false);
    }
  };

  // Login with debug user
  const loginWithDebugUser = async () => {
    try {
      await loginMutation.mutateAsync({ 
        username: "debuguser", 
        password: "debugpass" 
      });
      
      // After login, refetch user data
      await refetchUser();
      
      // Check session status
      await checkSessionStatus();
      
    } catch (error) {
      console.error("Debug login error:", error);
      
      toast({
        title: "Login Error",
        description: `Failed to login: ${String(error)}`,
        variant: "destructive",
      });
    }
  };

  // Direct login test (server-side)
  const testDirectLogin = async () => {
    try {
      setDebugLoading(true);
      console.log("Testing direct login...");
      const res = await fetch('/api/test/login', { credentials: 'include' });
      const data = await res.json();
      console.log("Direct login test result:", data);
      setDebugResponse(data);
      
      toast({
        title: data.success ? "Success" : "Error",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
      
      // After direct login, refetch user data
      await refetchUser();
      
      return data;
    } catch (error) {
      console.error("Direct login test error:", error);
      setDebugResponse({ error: String(error) });
      
      toast({
        title: "Error",
        description: `Direct login test failed: ${String(error)}`,
        variant: "destructive",
      });
      
      return { error: String(error) };
    } finally {
      setDebugLoading(false);
    }
  };

  // Check session status on component mount
  useEffect(() => {
    checkSessionStatus();
  }, []);

  return (
    <div className="container max-w-4xl py-10">
      <h1 className="text-3xl font-bold mb-8">Authentication Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Current Authentication State</CardTitle>
            <CardDescription>Information about the current user session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-1">User Data:</h3>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading user data...
                  </p>
                ) : user ? (
                  <pre className="text-xs p-3 bg-muted rounded-md overflow-auto max-h-40">
                    {JSON.stringify(user, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">Not authenticated</p>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold mb-1">Session Status:</h3>
                {sessionLoading ? (
                  <p className="text-sm text-muted-foreground flex items-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking session...
                  </p>
                ) : sessionStatus ? (
                  <pre className="text-xs p-3 bg-muted rounded-md overflow-auto max-h-40">
                    {JSON.stringify(sessionStatus, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">Session status not checked</p>
                )}
              </div>
              
              <Button 
                variant="outline" 
                onClick={checkSessionStatus}
                disabled={sessionLoading}
                className="w-full"
              >
                {sessionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Check Session Status"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Debug Action Response</CardTitle>
            <CardDescription>Result of the last debug action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <pre className="text-xs p-3 bg-muted rounded-md overflow-auto max-h-40">
                {debugResponse 
                  ? JSON.stringify(debugResponse, null, 2) 
                  : "No debug action performed yet"}
              </pre>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={createDebugUser}
                  disabled={debugLoading}
                >
                  {debugLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Debug User"
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={testDirectLogin}
                  disabled={debugLoading}
                >
                  {debugLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    "Test Direct Login"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Login with Debug User</CardTitle>
          <CardDescription>Use the pre-configured debug user account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                Debug user credentials:
                <br />
                <strong>Username:</strong> debuguser
                <br />
                <strong>Password:</strong> debugpass
              </p>
            </div>
            
            <Button 
              onClick={loginWithDebugUser}
              disabled={loginMutation.isPending}
              className="w-full"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login with Debug User"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/auth")}
        >
          Go to Auth Page
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setLocation("/")}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}