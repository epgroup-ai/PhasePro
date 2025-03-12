import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import NewEnquiry from "@/pages/new-enquiry";
import ProcessedEnquiries from "@/pages/processed-enquiries";
import EnquiryDetail from "@/pages/enquiry-detail";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import Header from "@/components/layout/header";
import NavigationTabs from "@/components/layout/navigation-tabs";
import Footer from "@/components/layout/footer";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/new-enquiry" component={NewEnquiry} />
      <Route path="/processed-enquiries" component={ProcessedEnquiries} />
      <Route path="/enquiries/:id" component={EnquiryDetail} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <NavigationTabs />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Router />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
