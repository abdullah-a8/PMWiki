import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"
import type { HealthCheckResponse } from "@/types"

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await apiClient.get<HealthCheckResponse>("/health")
      return response.data
    },
  })
}
