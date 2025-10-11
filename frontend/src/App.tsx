import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { HomePage } from "./pages/HomePage";
import { Loader2 } from "lucide-react";

// Lazy load heavy pages
const ComparePageStreaming = lazy(() => import("./pages/ComparePageStreaming").then(m => ({ default: m.ComparePageStreaming })));
const ProcessGeneratorPage = lazy(() => import("./pages/ProcessGeneratorPage").then(m => ({ default: m.ProcessGeneratorPage })));
const TopicGraphPage = lazy(() => import("./pages/TopicGraphPage").then(m => ({ default: m.TopicGraphPage })));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then(m => ({ default: m.LibraryPage })));
const StandardsLibraryPage = lazy(() => import("./pages/StandardsLibraryPage").then(m => ({ default: m.StandardsLibraryPage })));
const SectionDetailPage = lazy(() => import("./pages/SectionDetailPage").then(m => ({ default: m.SectionDetailPage })));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route 
            path="compare" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ComparePageStreaming />
              </Suspense>
            } 
          />
          <Route 
            path="generate" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ProcessGeneratorPage />
              </Suspense>
            } 
          />
          <Route 
            path="graph" 
            element={
              <Suspense fallback={<PageLoader />}>
                <TopicGraphPage />
              </Suspense>
            } 
          />
          <Route 
            path="library" 
            element={
              <Suspense fallback={<PageLoader />}>
                <LibraryPage />
              </Suspense>
            } 
          />
          <Route 
            path="library/:standard" 
            element={
              <Suspense fallback={<PageLoader />}>
                <StandardsLibraryPage />
              </Suspense>
            } 
          />
          <Route 
            path="sections/:id" 
            element={
              <Suspense fallback={<PageLoader />}>
                <SectionDetailPage />
              </Suspense>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
