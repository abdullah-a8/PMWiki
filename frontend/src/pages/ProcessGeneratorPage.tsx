import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Loader2,
  X,
  Briefcase,
  Code,
  Building2,
  FlaskConical,
  Package,
  Users,
  Calendar,
  Hammer,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  Workflow,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { API_BASE_URL } from "@/lib/constants";
import { toast } from "sonner";

// Form validation schema
const formSchema = z.object({
  project_type: z.enum([
    "software_development",
    "construction",
    "consulting",
    "research",
    "product_development",
    "organizational_change",
    "event_management",
    "infrastructure",
    "other",
  ]),
  project_description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must not exceed 1000 characters"),
  project_size: z.enum(["small", "medium", "large"]),
  constraints: z.string().optional(),
  priorities: z.string().optional(),
  focus_areas: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Help icon component with tooltip
const HelpIcon = ({ content }: { content: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs">
      <p className="text-xs">{content}</p>
    </TooltipContent>
  </Tooltip>
);

// Project type options with icons
const projectTypes = [
  { value: "software_development", label: "Software Development", icon: Code },
  { value: "construction", label: "Construction", icon: Building2 },
  { value: "consulting", label: "Consulting", icon: Briefcase },
  { value: "research", label: "Research", icon: FlaskConical },
  { value: "product_development", label: "Product Development", icon: Package },
  { value: "organizational_change", label: "Organizational Change", icon: Users },
  { value: "event_management", label: "Event Management", icon: Calendar },
  { value: "infrastructure", label: "Infrastructure", icon: Hammer },
  { value: "other", label: "Other", icon: Briefcase },
];

// Phase 2 Preset Scenarios
const PRESET_SCENARIOS = {
  software_dev: {
    name: "Custom Software Development",
    icon: Code,
    description: "Small team, short duration, well-defined requirements",
    data: {
      project_type: "software_development" as const,
      project_description: "Developing a mobile app with enterprise integration for a small team (<7 members) with well-defined requirements and tight deadlines (<6 months).",
      project_size: "small" as const,
      constraints: "tight deadline, limited budget, small team, fixed scope",
      priorities: "speed, quality, user experience",
      focus_areas: "risk management, change control, stakeholder engagement",
    },
  },
  innovative_product: {
    name: "Innovative Product Development",
    icon: Package,
    description: "R&D-heavy project with uncertain outcomes and evolving requirements",
    data: {
      project_type: "product_development" as const,
      project_description: "R&D-heavy project developing an innovative IoT device with uncertain outcomes and evolving requirements over 12 months.",
      project_size: "medium" as const,
      constraints: "uncertain requirements, R&D focus, innovation risk, technology unknowns",
      priorities: "innovation, adaptability, learning, stakeholder satisfaction",
      focus_areas: "risk management, stakeholder engagement, quality assurance, change control",
    },
  },
  government_project: {
    name: "Large Government Project",
    icon: Building2,
    description: "Large-scale infrastructure with strong governance and regulatory compliance",
    data: {
      project_type: "infrastructure" as const,
      project_description: "Large-scale government infrastructure project with civil, electrical, and IT components requiring strong governance and regulatory compliance over 24 months.",
      project_size: "large" as const,
      constraints: "regulatory compliance, procurement rules, strict governance, public accountability, budget oversight",
      priorities: "compliance, transparency, stakeholder satisfaction, risk mitigation",
      focus_areas: "risk management, quality assurance, stakeholder engagement, procurement management, governance",
    },
  },
} as const;

// Response types
interface ProcessPhase {
  phase_name: string;
  description: string;
  key_activities: string[];
  deliverables: string[];
  duration_guidance?: string;
}

interface ProcessRecommendation {
  area: string;
  recommendation: string;
  justification: string;
  source_standards: string[];
  citations: string[];
}

interface ProcessResponse {
  project_type: string;
  overview: string;
  phases: ProcessPhase[];
  key_recommendations: ProcessRecommendation[];
  tailoring_rationale: string;
  standards_alignment: {
    PMBOK?: string;
    PRINCE2?: string;
    ISO_21502?: string;
  };
  usage_stats: {
    model: string;
    tokens: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
}

export function ProcessGeneratorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      project_size: "medium",
      project_type: "software_development",
    },
  });

  const projectType = watch("project_type");
  const projectSize = watch("project_size");

  // Handle preset scenario selection
  const handlePresetSelect = (scenarioKey: keyof typeof PRESET_SCENARIOS) => {
    const scenario = PRESET_SCENARIOS[scenarioKey];

    // Populate form fields with preset data
    setValue("project_type", scenario.data.project_type);
    setValue("project_description", scenario.data.project_description);
    setValue("project_size", scenario.data.project_size);
    setValue("constraints", scenario.data.constraints);
    setValue("priorities", scenario.data.priorities);
    setValue("focus_areas", scenario.data.focus_areas);

    // Close the dialog
    setIsTemplateDialogOpen(false);

    // Clear any previous errors
    setError(null);

    // Show success toast
    toast.success(`${scenario.name} loaded successfully!`);
  };

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Convert comma-separated strings to arrays
      const payload = {
        project_type: data.project_type,
        project_description: data.project_description,
        project_size: data.project_size,
        constraints: data.constraints
          ? data.constraints.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        priorities: data.priorities
          ? data.priorities.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        focus_areas: data.focus_areas
          ? data.focus_areas.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
      };

      const response = await fetch(`${API_BASE_URL}/v1/generate-process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      setResult(responseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate process");
    } finally {
      setIsLoading(false);
    }
  };

  const getStandardBadgeColor = (standard: string) => {
    const colors: Record<string, string> = {
      PMBOK: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      PRINCE2: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      ISO_21502: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    };
    return colors[standard] || "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCitation(id);
    setTimeout(() => setCopiedCitation(null), 2000);
  };

  const hasGenerated = result !== null;

  return (
    <div className="w-full">
      {/* Initial centered form view */}
      {!hasGenerated && (
        <div className="mx-auto max-w-6xl space-y-8 pb-12">
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <Workflow className="h-6 w-6 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight">Generate Process</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Create a tailored project management process based on your specific scenario
            </p>
          </div>

          {/* Form Card */}
          <Card className="border-primary/20 shadow-sm max-w-3xl mx-auto" id="process-form">
            <CardHeader>
              <CardTitle>Project Scenario</CardTitle>
              <CardDescription>
                Describe your project details to generate a customized process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Select Template Button */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-base border-dashed border-2 hover:bg-primary/5"
                    onClick={() => setIsTemplateDialogOpen(true)}
                  >
                    <Workflow className="mr-2 h-5 w-5" />
                    Select a Template Scenario
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Choose from Phase 2 scenarios or customize your own below
                  </p>
                </div>

                <Separator />

                {/* Project Type */}
                <div className="space-y-2">
                  <Label htmlFor="project_type">Project Type *</Label>
                  <Select
                    value={projectType}
                    onValueChange={(value) => setValue("project_type", value as FormData["project_type"])}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.project_type && (
                    <p className="text-sm text-destructive">{errors.project_type.message}</p>
                  )}
                </div>

                {/* Project Description */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="project_description">Project Description *</Label>
                    <HelpIcon content="Describe your project, its goals, and key characteristics. Include details about scope, objectives, and any specific requirements or constraints." />
                  </div>
                  <Textarea
                    id="project_description"
                    placeholder="e.g., 'Developing a mobile app for real-time project tracking with integration to existing enterprise systems'"
                    className="min-h-[120px] resize-none"
                    {...register("project_description")}
                  />
                  {errors.project_description && (
                    <p className="text-sm text-destructive">{errors.project_description.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {watch("project_description")?.length || 0} / 1000 characters
                  </p>
                </div>

                {/* Project Size */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="project_size">Project Size *</Label>
                    <HelpIcon content="Select the project size based on duration and team size. This helps determine the appropriate level of process complexity and governance." />
                  </div>
                  <Select
                    value={projectSize}
                    onValueChange={(value) => setValue("project_size", value as FormData["project_size"])}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select project size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Small</span>
                          <span className="text-xs text-muted-foreground">
                            &lt; 6 months, &lt; 5 people
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="medium">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Medium</span>
                          <span className="text-xs text-muted-foreground">
                            6-12 months, 5-20 people
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="large">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Large</span>
                          <span className="text-xs text-muted-foreground">
                            &gt; 12 months, &gt; 20 people
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.project_size && (
                    <p className="text-sm text-destructive">{errors.project_size.message}</p>
                  )}
                </div>

                <Separator />

                {/* Optional Fields */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Additional Details (Optional)</h3>
                    <HelpIcon content="Provide additional context to help tailor the process. Use comma-separated values for multiple items in each field." />
                  </div>

                  {/* Constraints */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="constraints">Key Constraints</Label>
                      <HelpIcon content="List any limitations or restrictions that may affect the project approach, such as budget, time, resources, or regulatory requirements." />
                    </div>
                    <Input
                      id="constraints"
                      placeholder="e.g., tight budget, fixed deadline, regulatory compliance"
                      {...register("constraints")}
                    />
                    {errors.constraints && (
                      <p className="text-sm text-destructive">{errors.constraints.message}</p>
                    )}
                  </div>

                  {/* Priorities */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="priorities">Key Priorities</Label>
                      <HelpIcon content="Specify what matters most for this project's success, such as quality, speed, cost control, or stakeholder satisfaction." />
                    </div>
                    <Input
                      id="priorities"
                      placeholder="e.g., quality, speed, stakeholder satisfaction"
                      {...register("priorities")}
                    />
                    {errors.priorities && (
                      <p className="text-sm text-destructive">{errors.priorities.message}</p>
                    )}
                  </div>

                  {/* Focus Areas */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="focus_areas">Focus Areas</Label>
                      <HelpIcon content="Identify specific project management areas that need special attention or emphasis in your process." />
                    </div>
                    <Input
                      id="focus_areas"
                      placeholder="e.g., risk management, change control, quality assurance"
                      {...register("focus_areas")}
                    />
                    {errors.focus_areas && (
                      <p className="text-sm text-destructive">{errors.focus_areas.message}</p>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 text-base rounded-xl"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Process...
                    </>
                  ) : (
                    <>
                      <Workflow className="mr-2 h-5 w-5" />
                      Generate Tailored Process
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Results View */}
      {hasGenerated && result && (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
          {/* Compact Header */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              Generated Process
            </h1>
            <p className="text-sm text-muted-foreground">
              Tailored project management process for your scenario
            </p>
          </div>

          {/* Process Overview Card */}
          <Card className="border-primary/30 shadow-lg bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">Process Overview</CardTitle>
                  <CardDescription className="text-base">
                    Recommended approach for:{" "}
                    <span className="font-semibold text-foreground">
                      {projectTypes.find((t) => t.value === result.project_type)?.label ||
                        result.project_type}
                    </span>
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setError(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  New Process
                </Button>
              </div>
              <Separator className="mt-4" />
            </CardHeader>
            <CardContent>
              <div className="prose prose-zinc dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.overview}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Process Phases */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">Process Phases</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Recommended phases with activities and deliverables
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {result.phases.map((phase, index) => (
                <AccordionItem
                  key={index}
                  value={`phase-${index}`}
                  className="border rounded-xl px-6 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline py-6">
                    <div className="flex items-center gap-3 text-left">
                      <Badge variant="outline" className="shrink-0">
                        Phase {index + 1}
                      </Badge>
                      <span className="font-semibold text-lg">{phase.phase_name}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 pt-2">
                    <div className="space-y-4">
                      {/* Description */}
                      <p className="text-muted-foreground">{phase.description}</p>

                      {phase.duration_guidance && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{phase.duration_guidance}</span>
                        </div>
                      )}

                      <Separator />

                      {/* Key Activities */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Key Activities
                        </h4>
                        <ul className="list-disc list-outside ml-6 space-y-1 text-sm text-foreground/90">
                          {phase.key_activities.map((activity, i) => (
                            <li key={i}>{activity}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Deliverables */}
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          Deliverables
                        </h4>
                        <ul className="list-disc list-outside ml-6 space-y-1 text-sm text-foreground/90">
                          {phase.deliverables.map((deliverable, i) => (
                            <li key={i}>{deliverable}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Key Recommendations */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">Key Recommendations</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Evidence-based guidance tailored to your project
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {result.key_recommendations.map((rec, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="w-fit">
                        {rec.area}
                      </Badge>
                      <div className="flex gap-1">
                        {rec.source_standards.map((std) => (
                          <Badge
                            key={std}
                            variant="outline"
                            className={`text-xs ${getStandardBadgeColor(std)}`}
                          >
                            {std === "ISO_21502" ? "ISO 21502" : std}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <CardTitle className="text-base leading-tight">
                      {rec.recommendation}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{rec.justification}</p>

                    {rec.citations.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Citations:
                          </p>
                          {rec.citations.map((citation, i) => (
                            <div key={i} className="flex items-start justify-between gap-2">
                              <p className="text-xs text-muted-foreground italic flex-1">
                                {citation}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 shrink-0"
                                onClick={() => copyToClipboard(citation, `rec-${index}-${i}`)}
                              >
                                {copiedCitation === `rec-${index}-${i}` ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Tailoring Rationale */}
          <Card>
            <CardHeader>
              <CardTitle>Tailoring Rationale</CardTitle>
              <CardDescription>
                Why this process is customized for your specific scenario
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.tailoring_rationale}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Standards Alignment */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold">Standards Alignment</h2>
              <p className="text-sm text-muted-foreground mt-1">
                How this process draws from each standard
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* PMBOK */}
              {result.standards_alignment.PMBOK && (
                <Card className="border-blue-500/20">
                  <CardHeader>
                    <Badge
                      variant="outline"
                      className={`w-fit ${getStandardBadgeColor("PMBOK")}`}
                    >
                      PMBOK
                    </Badge>
                    <CardDescription className="text-xs mt-2">
                      Project Management Body of Knowledge
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/90">
                      {result.standards_alignment.PMBOK}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* PRINCE2 */}
              {result.standards_alignment.PRINCE2 && (
                <Card className="border-purple-500/20">
                  <CardHeader>
                    <Badge
                      variant="outline"
                      className={`w-fit ${getStandardBadgeColor("PRINCE2")}`}
                    >
                      PRINCE2
                    </Badge>
                    <CardDescription className="text-xs mt-2">
                      Projects IN Controlled Environments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/90">
                      {result.standards_alignment.PRINCE2}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* ISO 21502 */}
              {result.standards_alignment.ISO_21502 && (
                <Card className="border-teal-500/20">
                  <CardHeader>
                    <Badge
                      variant="outline"
                      className={`w-fit ${getStandardBadgeColor("ISO_21502")}`}
                    >
                      ISO 21502
                    </Badge>
                    <CardDescription className="text-xs mt-2">
                      International Standard for PM
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground/90">
                      {result.standards_alignment.ISO_21502}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Select a Template Scenario</DialogTitle>
            <DialogDescription>
              Choose one of the three required Phase 2 scenarios to instantly populate the form
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 mt-4">
            {/* Scenario 1: Software Development */}
            <Card
              className="hover:shadow-lg transition-all cursor-pointer flex flex-col border-blue-500/20 hover:border-blue-500/40"
              onClick={() => handlePresetSelect('software_dev')}
            >
              <CardHeader className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-3 bg-blue-500/10 rounded-lg">
                    <Code className="h-6 w-6 text-blue-500" />
                  </div>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    Small
                  </Badge>
                </div>
                <div className="flex items-start gap-2">
                  <CardTitle className="text-xl flex-1">Custom Software Development</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help shrink-0 mt-1" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs font-semibold mb-1">Lightweight Process</p>
                      <p className="text-xs">Focuses on speed and flexibility with minimal documentation. Emphasizes iterative delivery and quick adaptation. Primarily draws from PMBOK's Agile practices.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  Small team, short duration, well-defined requirements. Focus on speed and flexibility with minimal documentation.
                </CardDescription>
                <div className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    <span>&lt;7 members, &lt;6 months</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Lightweight & Agile Process</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                >
                  <Workflow className="h-4 w-4 mr-2" />
                  Use This Scenario
                </Button>
              </CardContent>
            </Card>

            {/* Scenario 2: Innovative Product */}
            <Card
              className="hover:shadow-lg transition-all cursor-pointer flex flex-col border-purple-500/20 hover:border-purple-500/40"
              onClick={() => handlePresetSelect('innovative_product')}
            >
              <CardHeader className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <Package className="h-6 w-6 text-purple-500" />
                  </div>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                    Medium
                  </Badge>
                </div>
                <div className="flex items-start gap-2">
                  <CardTitle className="text-xl flex-1">Innovative Product Development</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help shrink-0 mt-1" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs font-semibold mb-1">Hybrid/Adaptive Process</p>
                      <p className="text-xs">Balances innovation with control by combining agile iterations with structured stage-gates. Draws from PRINCE2's governance and PMBOK's adaptive approaches.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  R&amp;D-heavy project with uncertain outcomes and evolving requirements. Hybrid approach balancing innovation with control.
                </CardDescription>
                <div className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-3.5 w-3.5" />
                    <span>~12 months, R&amp;D focused</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Hybrid/Adaptive Process</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                >
                  <Workflow className="h-4 w-4 mr-2" />
                  Use This Scenario
                </Button>
              </CardContent>
            </Card>

            {/* Scenario 3: Government Project */}
            <Card
              className="hover:shadow-lg transition-all cursor-pointer flex flex-col border-teal-500/20 hover:border-teal-500/40"
              onClick={() => handlePresetSelect('government_project')}
            >
              <CardHeader className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-3 bg-teal-500/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-teal-500" />
                  </div>
                  <Badge variant="outline" className="bg-teal-500/10 text-teal-500 border-teal-500/20">
                    Large
                  </Badge>
                </div>
                <div className="flex items-start gap-2">
                  <CardTitle className="text-xl flex-1">Large Government Project</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help shrink-0 mt-1" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="text-xs font-semibold mb-1">Formal & Comprehensive Process</p>
                      <p className="text-xs">Strong governance emphasizing compliance, transparency, and stakeholder management. Heavily draws from PRINCE2's governance structure and ISO 21502 standards.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  Large-scale infrastructure with strong governance and regulatory compliance. Formal, comprehensive process.
                </CardDescription>
                <div className="pt-2 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Hammer className="h-3.5 w-3.5" />
                    <span>24 months, Multi-discipline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Formal & Comprehensive</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  className="w-full"
                  type="button"
                >
                  <Workflow className="h-4 w-4 mr-2" />
                  Use This Scenario
                </Button>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
