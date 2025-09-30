"""
Groq LLM Service
Handles LLM operations using Groq's llama-3.3-70b-versatile model
"""
import os
from typing import List, Dict, Any, Optional
from groq import Groq
import groq
from dotenv import load_dotenv
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


class GroqService:
    """Service for generating responses using Groq's Llama 3.3 70B model"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Groq client

        Args:
            api_key: Groq API key (defaults to GROQ_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables")

        self.client = Groq(api_key=self.api_key, max_retries=2, timeout=30.0)
        self.model = "llama-3.3-70b-versatile"

        logger.info(f"GroqService initialized with model: {self.model}")

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: Optional[int] = 2048,
        top_p: float = 1.0
    ) -> Dict[str, Any]:
        """
        Generate a completion using Groq API

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0.0-2.0), lower = more focused
            max_tokens: Maximum tokens to generate
            top_p: Nucleus sampling parameter

        Returns:
            Dictionary with 'content', 'usage', and metadata
        """
        try:
            logger.info(f"Generating response with {len(messages)} messages")

            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=top_p
            )

            result = {
                'content': response.choices[0].message.content,
                'model': response.model,
                'usage': {
                    'prompt_tokens': response.usage.prompt_tokens,
                    'completion_tokens': response.usage.completion_tokens,
                    'total_tokens': response.usage.total_tokens
                },
                'finish_reason': response.choices[0].finish_reason
            }

            logger.info(f"Response generated successfully. Tokens: {result['usage']['total_tokens']}")
            return result

        except groq.APIConnectionError as e:
            logger.error(f"Could not reach Groq API: {e}")
            raise Exception(f"Groq API connection error: {e}")
        except groq.RateLimitError as e:
            logger.error(f"Rate limit exceeded: {e}")
            raise Exception(f"Groq API rate limit exceeded. Please try again later.")
        except groq.APIStatusError as e:
            logger.error(f"Groq API error: {e.status_code} - {e.response}")
            raise Exception(f"Groq API error: {e.status_code}")
        except Exception as e:
            logger.error(f"Unexpected error generating response: {e}")
            raise

    def generate_citation_response(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        """
        Generate a citation-focused RAG response

        Args:
            query: User's search query
            context_chunks: List of relevant chunks from each standard with metadata
            temperature: Response temperature (0.3 = focused, factual)

        Returns:
            Dictionary with generated response and metadata
        """
        system_prompt = self._build_citation_system_prompt()
        user_prompt = self._build_citation_user_prompt(query, context_chunks)

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        return self.generate_response(messages, temperature=temperature, max_tokens=2048)

    def generate_comparison_response(
        self,
        topic: str,
        pmbok_chunks: List[Dict[str, Any]],
        prince2_chunks: List[Dict[str, Any]],
        iso_chunks: List[Dict[str, Any]],
        temperature: float = 0.3
    ) -> Dict[str, Any]:
        """
        Generate a comparison between standards on a specific topic

        Args:
            topic: Topic to compare (e.g., "Risk Management")
            pmbok_chunks: Relevant PMBOK sections
            prince2_chunks: Relevant PRINCE2 sections
            iso_chunks: Relevant ISO 21502 sections
            temperature: Response temperature

        Returns:
            Dictionary with comparison analysis
        """
        system_prompt = self._build_comparison_system_prompt()
        user_prompt = self._build_comparison_user_prompt(
            topic, pmbok_chunks, prince2_chunks, iso_chunks
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        return self.generate_response(messages, temperature=temperature, max_tokens=3072)

    def generate_process_response(
        self,
        project_description: str,
        project_type: str,
        project_size: str,
        constraints: List[str],
        priorities: List[str],
        focus_areas: List[str],
        context_chunks: List[Dict[str, Any]],
        temperature: float = 0.4
    ) -> Dict[str, Any]:
        """
        Generate a tailored project process based on scenario and context

        Args:
            project_description: Description of the project
            project_type: Type of project
            project_size: Size of project (small/medium/large)
            constraints: List of constraints
            priorities: List of priorities
            focus_areas: Specific areas to emphasize
            context_chunks: Relevant sections from standards
            temperature: Response temperature (0.4 = creative but grounded)

        Returns:
            Dictionary with structured process generation
        """
        system_prompt = self._build_process_system_prompt()
        user_prompt = self._build_process_user_prompt(
            project_description=project_description,
            project_type=project_type,
            project_size=project_size,
            constraints=constraints,
            priorities=priorities,
            focus_areas=focus_areas,
            context_chunks=context_chunks
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        return self.generate_response(messages, temperature=temperature, max_tokens=4096)

    def _build_citation_system_prompt(self) -> str:
        """Build system prompt for citation-focused responses"""
        return """You are an expert project management assistant specializing in PMBOK 7th Edition (2021), PRINCE2 (2017), and ISO 21502:2020 standards.

Your role is to provide accurate, citation-backed answers to questions about project management standards. You MUST:

1. **Citation Requirements**:
   - Always cite the exact standard, section number, and page number
   - Use format: "(Standard Section X.Y, p. Z)" or "(Standard Section X.Y, pp. Z1-Z2)"
   - Only reference information explicitly provided in the context
   - Never fabricate or infer information not in the source material

2. **Response Structure**:
   - Start with a clear, direct answer to the question
   - Provide specific details from EACH standard's perspective
   - Highlight key differences or similarities between standards
   - Keep responses concise but comprehensive (2-4 paragraphs)

3. **Accuracy & Tone**:
   - Be precise and academic in tone
   - Use exact terminology from the standards
   - If information is not available in context, explicitly state this
   - Never make assumptions beyond what's in the provided text

4. **Additional Context**:
   - You will be provided with the highest-scoring chunk from each standard
   - Additional relevant chunks may be included for broader context
   - Focus primarily on the highest-scoring chunks but integrate supporting details"""

    def _build_citation_user_prompt(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Build user prompt with query and context chunks

        Args:
            query: User's question
            context_chunks: List of dicts with keys: standard, section_number, section_title,
                           page_start, page_end, content, score, is_primary

        Returns:
            Formatted prompt string
        """
        # Separate primary (highest-scoring) and additional chunks
        primary_chunks = [c for c in context_chunks if c.get('is_primary', False)]
        additional_chunks = [c for c in context_chunks if not c.get('is_primary', False)]

        prompt_parts = [f"Question: {query}\n"]

        # Add primary context from each standard
        if primary_chunks:
            prompt_parts.append("\n=== PRIMARY CONTEXT (Highest Relevance) ===\n")
            for chunk in primary_chunks:
                citation = self._format_chunk_citation(chunk)
                prompt_parts.append(f"\n**{chunk['standard']}** - {citation}")
                prompt_parts.append(f"Content: {chunk['content']}\n")

        # Add additional context
        if additional_chunks:
            prompt_parts.append("\n=== ADDITIONAL CONTEXT (Supporting Information) ===\n")
            for chunk in additional_chunks:
                citation = self._format_chunk_citation(chunk)
                prompt_parts.append(f"\n**{chunk['standard']}** - {citation}")
                prompt_parts.append(f"Content: {chunk['content'][:300]}...\n")  # Truncate for space

        prompt_parts.append("\nProvide a comprehensive answer with proper citations:")

        return "".join(prompt_parts)

    def _build_comparison_system_prompt(self) -> str:
        """Build system prompt for standard comparisons"""
        return """You are an expert in comparing project management standards: PMBOK 7th Edition (2021), PRINCE2 (2017), and ISO 21502:2020.

Your role is to provide insightful, evidence-based comparisons. You MUST:

1. **Comparison Structure**:
   - **Similarities**: Common approaches, shared principles, overlapping guidance
   - **Differences**: Unique terminology, different methodologies, varying emphasis
   - **Unique Elements**: What only one standard covers or emphasizes strongly

2. **Citation Requirements**:
   - Always cite: "(Standard Section X.Y, p. Z)"
   - Support every comparison point with specific references
   - Only use information from provided context

3. **Analysis Depth**:
   - Go beyond surface-level observations
   - Explain WHY differences exist when clear from context
   - Highlight practical implications for practitioners
   - Be balanced - don't favor one standard over others

4. **Response Format**:
   - Start with a brief overview
   - Use clear headings: Similarities, Differences, Unique Points
   - Use bullet points for clarity
   - Keep response comprehensive but focused (3-5 paragraphs)"""

    def _build_comparison_user_prompt(
        self,
        topic: str,
        pmbok_chunks: List[Dict[str, Any]],
        prince2_chunks: List[Dict[str, Any]],
        iso_chunks: List[Dict[str, Any]]
    ) -> str:
        """Build prompt for standard comparison"""
        prompt_parts = [f"Topic for Comparison: {topic}\n"]

        # Add PMBOK context
        if pmbok_chunks:
            prompt_parts.append("\n=== PMBOK 7th Edition (2021) ===\n")
            for chunk in pmbok_chunks[:2]:  # Top 2 chunks
                citation = self._format_chunk_citation(chunk)
                prompt_parts.append(f"\n{citation}")
                prompt_parts.append(f"Content: {chunk['content']}\n")

        # Add PRINCE2 context
        if prince2_chunks:
            prompt_parts.append("\n=== PRINCE2 (2017) ===\n")
            for chunk in prince2_chunks[:2]:
                citation = self._format_chunk_citation(chunk)
                prompt_parts.append(f"\n{citation}")
                prompt_parts.append(f"Content: {chunk['content']}\n")

        # Add ISO 21502 context
        if iso_chunks:
            prompt_parts.append("\n=== ISO 21502:2020 ===\n")
            for chunk in iso_chunks[:2]:
                citation = self._format_chunk_citation(chunk)
                prompt_parts.append(f"\n{citation}")
                prompt_parts.append(f"Content: {chunk['content']}\n")

        prompt_parts.append("\nProvide a comprehensive comparison with proper citations:")

        return "".join(prompt_parts)

    def _format_chunk_citation(self, chunk: Dict[str, Any]) -> str:
        """Format a chunk's citation information"""
        section = chunk['section_number']
        title = chunk['section_title']
        page_start = chunk['page_start']
        page_end = chunk.get('page_end')

        page_ref = f"p. {page_start}"
        if page_end and page_end != page_start:
            page_ref = f"pp. {page_start}-{page_end}"

        return f"Section {section}: {title} ({page_ref})"

    def _build_process_system_prompt(self) -> str:
        """Build system prompt for process generation"""
        return """You are an expert project management consultant with deep knowledge of PMBOK 7th Edition (2021), PRINCE2 (2017), and ISO 21502:2020 standards.

Your role is to generate tailored, evidence-based project processes for specific scenarios. You MUST:

1. **Process Design Requirements**:
   - Create a practical, actionable process tailored to the specific project scenario
   - Base all recommendations on the provided standard content (cite sources)
   - Consider project constraints, priorities, and focus areas explicitly
   - Recommend 3-5 phases appropriate for the project type and size
   - For each phase: provide key activities, deliverables, and duration guidance

2. **Recommendations**:
   - Provide 4-6 specific, actionable recommendations
   - Each recommendation must address constraints/priorities/focus areas
   - Include justification explaining WHY this fits the scenario
   - Cite specific standards supporting each recommendation
   - Format: Area, Recommendation, Justification, Source Standards, Citations

3. **Tailoring Rationale**:
   - Explain HOW and WHY you adapted standard practices for this project
   - Address constraints directly (e.g., "Due to tight deadline, we emphasize...")
   - Explain priority-driven choices (e.g., "Given quality focus, we recommend...")
   - Show which standard practices were emphasized/de-emphasized and why

4. **Standards Alignment**:
   - Explain how your process aligns with each of the three standards
   - Show which elements came from PMBOK, PRINCE2, and ISO 21502
   - Be specific about what you borrowed from each

5. **Output Format**:
   - Return a valid JSON object matching this structure:
   ```json
   {
     "overview": "High-level approach summary (2-3 sentences)",
     "phases": [
       {
         "phase_name": "Phase name",
         "description": "What this phase accomplishes",
         "key_activities": ["Activity 1", "Activity 2", ...],
         "deliverables": ["Deliverable 1", "Deliverable 2", ...],
         "duration_guidance": "e.g., '10-15% of timeline' or '2-3 weeks'"
       }
     ],
     "key_recommendations": [
       {
         "area": "e.g., Risk Management",
         "recommendation": "Specific actionable recommendation",
         "justification": "Why this fits the scenario",
         "source_standards": ["PMBOK", "ISO_21502"],
         "citations": ["PMBOK (2021), Section X.Y, p. Z"]
       }
     ],
     "tailoring_rationale": "Detailed explanation of how/why process was tailored",
     "standards_alignment": {
       "PMBOK": "How this process aligns with PMBOK",
       "PRINCE2": "How this process aligns with PRINCE2",
       "ISO_21502": "How this process aligns with ISO 21502"
     }
   }
   ```

6. **Critical Rules**:
   - Only use information from provided context chunks
   - Always cite sources using exact section and page numbers
   - Be pragmatic - balance theory with practical implementation
   - Never invent practices not supported by provided standards content"""

    def _build_process_user_prompt(
        self,
        project_description: str,
        project_type: str,
        project_size: str,
        constraints: List[str],
        priorities: List[str],
        focus_areas: List[str],
        context_chunks: List[Dict[str, Any]]
    ) -> str:
        """Build user prompt for process generation"""
        prompt_parts = [
            "=== PROJECT SCENARIO ===\n",
            f"Project Type: {project_type}\n",
            f"Project Size: {project_size}\n",
            f"Description: {project_description}\n"
        ]

        if constraints:
            prompt_parts.append(f"\nConstraints: {', '.join(constraints)}")

        if priorities:
            prompt_parts.append(f"\nPriorities: {', '.join(priorities)}")

        if focus_areas:
            prompt_parts.append(f"\nFocus Areas: {', '.join(focus_areas)}")

        # Add context from standards
        prompt_parts.append("\n\n=== RELEVANT STANDARDS CONTENT ===\n")

        # Group by standard for better organization
        pmbok_chunks = [c for c in context_chunks if c['standard'] == 'PMBOK']
        prince2_chunks = [c for c in context_chunks if c['standard'] == 'PRINCE2']
        iso_chunks = [c for c in context_chunks if c['standard'] == 'ISO_21502']

        if pmbok_chunks:
            prompt_parts.append("\n--- PMBOK 7th Edition (2021) ---\n")
            for chunk in pmbok_chunks[:5]:  # Top 5 PMBOK
                citation = self._format_chunk_citation(chunk)
                prompt_parts.append(f"\n{citation}\n{chunk['content'][:400]}...\n")

        if prince2_chunks:
            prompt_parts.append("\n--- PRINCE2 (2017) ---\n")
            for chunk in prince2_chunks[:5]:
                citation = self._format_chunk_citation(chunk)
                prompt_parts.append(f"\n{citation}\n{chunk['content'][:400]}...\n")

        if iso_chunks:
            prompt_parts.append("\n--- ISO 21502:2020 ---\n")
            for chunk in iso_chunks[:5]:
                citation = self._format_chunk_citation(chunk)
                prompt_parts.append(f"\n{citation}\n{chunk['content'][:400]}...\n")

        prompt_parts.append("\n=== TASK ===\n")
        prompt_parts.append("Generate a tailored project process for this scenario using the format specified in the system prompt. ")
        prompt_parts.append("Ensure all recommendations address the stated constraints, priorities, and focus areas. ")
        prompt_parts.append("Return ONLY the JSON object, no additional text.")

        return "".join(prompt_parts)

    def health_check(self) -> Dict[str, Any]:
        """
        Perform a health check on the Groq service

        Returns:
            Dictionary with service status
        """
        try:
            # Simple test with minimal tokens
            test_response = self.generate_response(
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )

            return {
                'status': 'healthy',
                'model': self.model,
                'test_tokens': test_response['usage']['total_tokens']
            }
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e)
            }


# Singleton instance
_groq_service = None

def get_groq_service() -> GroqService:
    """Get or create the Groq service singleton"""
    global _groq_service
    if _groq_service is None:
        _groq_service = GroqService()
    return _groq_service