import { RouterProvider, type createBrowserRouter } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";

export default function App({ router }: { router: ReturnType<typeof createBrowserRouter> }) {
  return (
    <HelmetProvider>
      <AuthProvider>
        <LanguageProvider>
          <RouterProvider router={router} />
        </LanguageProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
