import { useHealthCheck } from "./hooks/useHealthCheck"

function App() {
  const { data, isLoading, error } = useHealthCheck()

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <h1 className="mb-4 text-3xl font-bold">PMWiki Frontend</h1>
        <div className="space-y-2">
          <p className="text-muted-foreground">Backend Connection Status:</p>
          {isLoading && <p className="text-yellow-500">Connecting...</p>}
          {error && (
            <div className="text-red-500">
              <p>❌ Failed to connect to backend</p>
              <p className="text-sm">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </div>
          )}
          {data && (
            <div className="text-green-500">
              <p>✓ Connected to backend</p>
              <p className="text-sm">{data.message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
