import axios from "axios"
import { API_BASE_URL } from "./constants"

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

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
