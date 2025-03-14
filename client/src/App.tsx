import { Switch, Route, useLocation } from "wouter";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import NewEnquiry from "@/pages/new-enquiry";
import ProcessedEnquiries from "@/pages/processed-enquiries";
import EnquiryDetail from "@/pages/enquiry-detail";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth-page";
import Header from "@/components/layout/header";
import NavigationTabs from "@/components/layout/navigation-tabs";
import Footer from "@/components/layout/footer";
import { AuthProvider } from "./hooks/use-auth";
import { useAuth } from "./hooks/use-auth";
import { Loader2 } from "lucide-react";
import { TourProvider } from "@/components/ui/tooltip-tour";

// Custom ProtectedRoute component that avoids the separate file dependency
function ProtectedRoute({
  path,
  component: Component
}: {
  path: string;
  component: React.ComponentType;
}) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }
  
  if (!user) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Route path="*">
            {() => {
              window.location.href = "/auth";
              return null;
            }}
          </Route>
        </div>
      </Route>
    );
  }
  
  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}

function AuthenticatedRoutes() {
  const [location] = useLocation();
  const { user, isLoading } = useAuth();
  const isAuthPage = location === "/auth";
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // Don't render header/nav/footer on the auth page or if not logged in
  if (isAuthPage || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <main className="flex-1">
          <Switch>
            <Route path="/auth">
              <AuthPage />
            </Route>
            <Route path="*">
              {() => {
                window.location.href = "/auth";
                return null;
              }}
            </Route>
          </Switch>
        </main>
      </div>
    );
  }
  
  // Regular layout with header/navigation for authenticated users
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <NavigationTabs />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Switch>
          <Route path="/">
            <Dashboard />
          </Route>
          <Route path="/new-enquiry">
            <NewEnquiry />
          </Route>
          <Route path="/processed-enquiries">
            <ProcessedEnquiries />
          </Route>
          <Route path="/enquiries/:id">
            <EnquiryDetail />
          </Route>
          <Route path="/analytics">
            <Analytics />
          </Route>
          <Route path="/settings">
            <Settings />
          </Route>
          <Route path="/auth">
            <AuthPage />
          </Route>
          <Route>
            <NotFound />
          </Route>
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <TourProvider>
        <AuthenticatedRoutes />
      </TourProvider>
    </AuthProvider>
  );
}

export default App;
