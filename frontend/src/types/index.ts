// API Response Types

export interface Section {
  id: string
  section_id: string
  title: string
  content: string
  standard: string
  token_count?: number
}

export interface SearchResult {
  llm_answer: string
  primary_sources: Section[]
  additional_context: Section[]
  token_usage?: number
}

export interface ComparisonResult {
  summary: string
  pmbok_section?: Section
  prince2_section?: Section
  iso_section?: Section
  similarities: string[]
  differences: string[]
  unique_points: string[]
}

export interface SimilarityResult {
  section: Section
  similarity_score: number
}

export interface ProcessPhase {
  phase_name: string
  phase_number: number
  activities: string[]
  deliverables: string[]
  estimated_duration?: string
}

export interface ProcessGenerationResult {
  project_name: string
  phases: ProcessPhase[]
  tailoring_rationale: string
  standards_alignment: {
    pmbok?: string
    prince2?: string
    iso_21502?: string
  }
  citations: string[]
}

export interface ProjectScenario {
  project_name: string
  project_type: string
  project_size: "Small" | "Medium" | "Large"
  project_duration: string
  industry: string
  compliance_requirements: string
  key_constraints: string
  project_goals: string
  success_criteria: string
}

export interface HealthCheckResponse {
  status: string
  message: string
}
