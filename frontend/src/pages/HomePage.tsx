import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to PMWiki</h1>
        <p className="text-muted-foreground mt-2">
          Citation-focused RAG system for PM standards
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Search Standards</CardTitle>
            <CardDescription>
              Ask questions and get answers from PM standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Natural language search across PMBOK, PRINCE2, and ISO 21502
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compare Standards</CardTitle>
            <CardDescription>
              Side-by-side comparison of different standards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analyze similarities and differences across standards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Process</CardTitle>
            <CardDescription>
              Create tailored project processes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Scenario-based process generation with citations
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
