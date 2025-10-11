import axios from "axios"
import { API_BASE_URL } from "./constants"
import type { GraphParams, GraphData, ClusterDetails, GraphStats } from "@/types/graph"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Export as `api` for convenience
export const api = apiClient

// Graph API methods
export const graphApi = {
  getTopicNetwork: (params?: GraphParams) =>
    api.get<GraphData>('/v1/graph/topic-network', { params }),
  
  getClusterDetails: (clusterId: string) =>
    api.get<ClusterDetails>(`/v1/graph/clusters/${clusterId}`),
  
  getGraphStats: () =>
    api.get<GraphStats>('/v1/graph/stats'),
}

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add any auth tokens here if needed
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle errors globally
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.data)
    } else if (error.request) {
      // Request was made but no response received
      console.error("Network Error:", error.message)
    } else {
      // Something else happened
      console.error("Error:", error.message)
    }
    return Promise.reject(error)
  }
)
