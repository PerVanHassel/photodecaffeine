import { RouterProvider } from "react-router";
import { HelmetProvider } from "react-helmet-async";
import { router } from "./routes";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
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
