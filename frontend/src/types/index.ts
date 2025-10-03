// API Response Types (Aligned with Backend Schema)

// Source Reference (from search results)
export interface SourceReference {
  id: string
  standard: string
  section_number: string
  section_title: string
  page_start: number
  page_end?: number
  content: string
  citation: string
  relevance_score: number
}

// Usage Statistics
export interface UsageStats {
  model: string
  tokens: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  chunks_retrieved: number
  primary_sources_count: number
  additional_sources_count: number
}

// Search Response
export interface SearchResult {
  query: string
  answer: string
  primary_sources: SourceReference[]
  additional_context: SourceReference[]
  usage_stats: UsageStats
}

// Section Detail Response
export interface Section {
  id: string
  standard: string
  section_number: string
  section_title: string
  level: number
  page_start?: number
  page_end?: number
  content: string
  citation_key: string
  citation_apa: string
  citation_ieee: string
  parent_chain: any[]
  child_count?: number
  content_flags: Record<string, any>
  created_at?: string
}

// Section List Item (for standards library)
export interface SectionListItem {
  id: string
  section_number: string
  section_title: string
  level: number
  page_start?: number
  citation_key: string
}

// Standards Library Response
export interface StandardInfo {
  standard: string
  total_sections: number
  sections: SectionListItem[]
  description?: string
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

// Section Comparison Types
export interface SectionComparisonItem {
  id: string
  standard: string
  section_number: string
  section_title: string
  page_start: number
  page_end?: number
  content: string
  citation: string
  relevance_score: number
}

export interface SectionsByTopicResponse {
  topic: string
  sections: {
    PMBOK: SectionComparisonItem | null
    PRINCE2: SectionComparisonItem | null
    ISO_21502: SectionComparisonItem | null
  }
}
