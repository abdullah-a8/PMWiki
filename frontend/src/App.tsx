import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { HomePage } from "./pages/HomePage";
import { ComparePage } from "./pages/ComparePage";
import { ProcessGeneratorPage } from "./pages/ProcessGeneratorPage";
import { LibraryPage } from "./pages/LibraryPage";
import { SectionDetailPage } from "./pages/SectionDetailPage";
import { StandardsLibraryPage } from "./pages/StandardsLibraryPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="generate" element={<ProcessGeneratorPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/:standard" element={<StandardsLibraryPage />} />
          <Route path="sections/:id" element={<SectionDetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
