import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

export function PlatformQueryProvider(props: PropsWithChildren) {
  const [queryClient] = useState(createPlatformQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
  );
}

function createPlatformQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
      },
    },
  });
}
