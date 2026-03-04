// client/src/App.tsx
// Root application component.
// Wires up routing, layout (Header), and global providers.

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { OfflineToast } from "@/components/OfflineToast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import Home from "@/pages/Home";
import Details from "@/pages/Details";
import Favorites from "@/pages/Favorites";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="recipes-theme">
        <BrowserRouter>
          {/* Global offline toast listener */}
          <OfflineToast />

          {/* Sonner toast container — positioned bottom-center to avoid overlapping header buttons */}
          <Toaster
            richColors
            closeButton
            position="bottom-center"
            toastOptions={{ duration: 4_000 }}
          />

          {/* App shell */}
          <div className="min-h-screen flex flex-col">
            <Header />

            {/* Error boundary wraps all page content */}
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/meal/:id" element={<Details />} />
                <Route path="/favorites" element={<Favorites />} />
                {/* Fallback route */}
                <Route
                  path="*"
                  element={
                    <main
                      id="main-content"
                      className="container py-20 text-center"
                    >
                      <p className="text-6xl mb-4">🍳</p>
                      <h1 className="text-2xl font-bold mb-2">
                        Page not found
                      </h1>
                      <p className="text-muted-foreground">
                        <a href="/" className="underline">
                          Back to recipes
                        </a>
                      </p>
                    </main>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </div>
        </BrowserRouter>
      </ThemeProvider>

      {/* TanStack Query devtools — removed in production build */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
