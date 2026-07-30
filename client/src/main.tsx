import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { trpc } from "./lib/trpc";
import App from "./App";
import "./index.css";
import { getSupabaseAccessToken } from "./_core/supabase";

// Auth: Supabase token is passed via Authorization header in every tRPC call
// (see headers() function in httpBatchLink config below)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: (failureCount, error: unknown) => {
        const err = error as { data?: { httpStatus?: number } };
        if (err?.data?.httpStatus === 401) return false;
        if (failureCount > 3) return false;
        return true;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
    },
  },
});

function redirectToLoginIfUnauthorized(error: unknown) {
  const err = error as { data?: { httpStatus?: number } };
  if (err?.data?.httpStatus === 401) {
    window.location.href = "/login";
  }
}

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe((event) => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      maxURLLength: 4096,
      headers() {
        // Auth: try Supabase session token first (Bearer), fallback to httpOnly cookie
        const token = getSupabaseAccessToken();
        const headers: Record<string, string> = {};
        if (token) {
          headers["authorization"] = `Bearer ${token}`;
        }
        return headers;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
