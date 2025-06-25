
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AttendancePage } from "./pages/AttendancePage";
import { ResultsPage } from "./pages/ResultsPage";
import { QRCodePage } from "./pages/QRCodePage";
import { EditSheetPage } from "./pages/EditSheetPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* Public attendance page - no auth required */}
            <Route path="/attend/:sheetId" element={<AttendancePage />} />
            {/* Protected routes */}
            <Route path="/results/:sheetId" element={<ResultsPage />} />
            <Route path="/qr/:sheetId" element={<QRCodePage />} />
            <Route path="/edit/:sheetId" element={<EditSheetPage />} />
            {/* Catch-all 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
