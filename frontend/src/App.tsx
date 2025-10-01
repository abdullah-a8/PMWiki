import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RootLayout } from "./components/layout/RootLayout";
import { HomePage } from "./pages/HomePage";
import { SearchPage } from "./pages/SearchPage";
import { ComparePage } from "./pages/ComparePage";
import { ProcessGeneratorPage } from "./pages/ProcessGeneratorPage";
import { LibraryPage } from "./pages/LibraryPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="generate" element={<ProcessGeneratorPage />} />
          <Route path="library" element={<LibraryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
