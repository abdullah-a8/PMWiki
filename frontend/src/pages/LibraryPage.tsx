import { useNavigate } from "react-router-dom";
import { BookOpen, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const standards = [
  {
    name: "PMBOK",
    fullName: "Project Management Body of Knowledge",
    description: "A Guide to the Project Management Body of Knowledge - the globally recognized standard for project management",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    icon: "📘",
  },
  {
    name: "PRINCE2",
    fullName: "Projects IN Controlled Environments",
    description: "A process-based project management method focusing on organization and control throughout the project lifecycle",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    icon: "📗",
  },
  {
    name: "ISO_21502",
    fullName: "ISO 21502",
    description: "International standard providing guidance on project management principles and processes",
    color: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    icon: "📙",
  },
];

export function LibraryPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Browse Library</h1>
        <p className="text-muted-foreground mt-2">
          Explore PM standards and their sections
        </p>
      </div>

      {/* Standards Grid */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {standards.map((standard) => (
          <Card
            key={standard.name}
            className="hover:shadow-lg transition-shadow cursor-pointer flex flex-col"
            onClick={() => navigate(`/library/${standard.name}`)}
          >
            <CardHeader className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-4xl">{standard.icon}</span>
                <Badge
                  variant="outline"
                  className={`${standard.color} text-sm`}
                >
                  {standard.name}
                </Badge>
              </div>
              <CardTitle className="text-xl">{standard.fullName}</CardTitle>
              <CardDescription className="mt-2">
                {standard.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/library/${standard.name}`);
                }}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Sections
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
