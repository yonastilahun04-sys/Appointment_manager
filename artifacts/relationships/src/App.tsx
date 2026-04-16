import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Pipeline from "@/pages/pipeline";
import Contacts from "@/pages/contacts";
import ContactDetail from "@/pages/contact-detail";
import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import { Layout } from "@/components/layout";
import { useGetWorkspace } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

const queryClient = new QueryClient();

function GuardedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { data: workspace, isLoading } = useGetWorkspace();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && workspace && !workspace.initialized) {
      setLocation("/onboarding");
    }
  }, [isLoading, workspace, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (workspace && !workspace.initialized) {
    return null; // Will redirect via useEffect
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/" component={() => <GuardedRoute component={Dashboard} />} />
      <Route path="/pipeline" component={() => <GuardedRoute component={Pipeline} />} />
      <Route path="/contacts" component={() => <GuardedRoute component={Contacts} />} />
      <Route path="/contacts/:id" component={() => <GuardedRoute component={ContactDetail} />} />
      <Route path="/settings" component={() => <GuardedRoute component={Settings} />} />
      <Route component={() => <GuardedRoute component={NotFound} />} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
