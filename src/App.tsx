import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth, RequireAdmin, RedirectIfLoggedIn } from "@/components/RouteGuards";

// Pages
import AuthPage from "@/pages/AuthPage";
import AdminLayout from "@/layouts/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import WorkersPage from "@/pages/admin/WorkersPage";
import WorkerDetailPage from "@/pages/admin/WorkerDetailPage";
import TasksPage from "@/pages/admin/TasksPage";
import TaskCreatePage from "@/pages/admin/TaskCreatePage";
import TaskDetailPage from "@/pages/admin/TaskDetailPage";
import AnalyticsPage from "@/pages/admin/AnalyticsPage";
import SettingsPage from "@/pages/admin/SettingsPage";
import WorkerDashboard from "@/pages/worker/WorkerDashboard";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10_000 } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner richColors position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Public auth */}
            <Route path="/auth" element={
              <RedirectIfLoggedIn><AuthPage /></RedirectIfLoggedIn>
            } />

            {/* Admin routes */}
            <Route path="/admin" element={
              <RequireAdmin><AdminLayout /></RequireAdmin>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="workers" element={<WorkersPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="tasks/new" element={<TaskCreatePage />} />
              <Route path="tasks/:id" element={<TaskDetailPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Worker routes */}
            <Route path="/worker" element={
              <RequireAuth><WorkerDashboard /></RequireAuth>
            } />

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
