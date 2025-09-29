#!/usr/bin/env python3
"""
Enhanced PMBOK Text Cleaning Script
Improved version that better preserves sentence structure and paragraph flow.
"""

import json
import re
from typing import Dict, Any
import copy

def clean_pmbok_text_enhanced(text: str) -> str:
    """
    Enhanced cleaning that preserves content and sentence structure better.

    Key improvements:
    - Better paragraph preservation
    - Smarter sentence boundary detection
    - Improved table content extraction
    - Better figure reference handling
    """

    # Step 1: Preserve existing paragraph breaks by marking them
    text = re.sub(r'\n\s*\n', '§PARAGRAPH_BREAK§', text)

    # Step 2: Remove ASCII table borders but preserve table content
    # First, extract meaningful content from table rows
    def extract_table_content(match):
        content = match.group(0)

        # Skip pure formatting lines
        if re.match(r'^[\+\-\=\|\s]*$', content):
            return ''

        # Extract actual content from between | symbols
        rows = []
        for line in content.split('\n'):
            if '|' in line and not re.match(r'^[\+\-\=\|\s]*$', line):
                # Extract content between | symbols
                cells = [cell.strip() for cell in line.split('|')[1:-1]]  # Skip first/last empty
                meaningful_cells = [cell for cell in cells if cell and not re.match(r'^[\-\=\s]*$', cell)]
                if meaningful_cells:
                    rows.append(' '.join(meaningful_cells))

        if rows:
            return '\n' + '\n'.join(rows) + '\n'
        return ''

    # Remove table structures while preserving content
    text = re.sub(r'(\+[-=]+\+\n(?:.*?\n)*?\+[-=]+\+)', extract_table_content, text, flags=re.MULTILINE)

    # Clean remaining table artifacts
    text = re.sub(r'\+[-=]+\+', '', text)
    text = re.sub(r'^\s*\|.*?\|\s*$', '', text, flags=re.MULTILINE)

    # Step 3: Normalize bullet points
    text = re.sub(r'▶\s*', '• ', text)

    # Step 4: Handle figure references more intelligently
    # Keep figure references but make them cleaner
    text = re.sub(r'Figure (\d+-\d+)\.?\s*([^§\n]*)', r'Figure \1: \2', text)

    # Step 5: Restore paragraph breaks and clean spacing
    text = re.sub(r'§PARAGRAPH_BREAK§', '\n\n', text)

    # Step 6: Fix line breaks within sentences (but preserve intentional breaks)
    # Only join lines if they don't end with sentence-ending punctuation
    def smart_line_join(match):
        line1, line2 = match.groups()
        # Don't join if first line ends with sentence-ending punctuation
        if re.search(r'[.!?:]$', line1.strip()):
            return line1 + '\n' + line2
        # Don't join if second line starts with bullet or section marker
        if re.match(r'^\s*[•▶]', line2) or re.match(r'^\s*Section\s+\d', line2):
            return line1 + '\n' + line2
        # Join other cases
        return line1 + ' ' + line2

    text = re.sub(r'([^\n])\n([^\n•▶])', smart_line_join, text)

    # Step 7: Clean up spacing
    # Normalize multiple spaces but preserve single line breaks
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'^\s+|\s+$', '', text, flags=re.MULTILINE)

    # Normalize paragraph spacing
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Step 8: Final cleanup of artifacts
    text = re.sub(r'^\s*[+|=-]+\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)

    return text.strip()

def process_with_verification(input_file: str, output_file: str):
    """Enhanced processing with content verification."""

    with open(input_file, 'r', encoding='utf-8') as f:
        chunks = json.load(f)

    cleaned_chunks = []
    stats = {
        'total_chunks': len(chunks),
        'content_preserved': 0,
        'major_cleaning': 0,
        'minor_cleaning': 0,
        'chunks_with_figures': 0,
        'chunks_with_tables': 0
    }

    for chunk in chunks:
        cleaned_chunk = copy.deepcopy(chunk)

        original_text = chunk['text']
        cleaned_text = clean_pmbok_text_enhanced(original_text)

        # Content verification
        original_words = set(re.findall(r'\b\w+\b', original_text.lower()))
        cleaned_words = set(re.findall(r'\b\w+\b', cleaned_text.lower()))

        word_retention = len(cleaned_words) / len(original_words) if original_words else 1

        # Statistics
        has_figures = bool(re.search(r'Figure \d+-\d+', original_text))
        has_tables = bool(re.search(r'\+[-=]+\+', original_text))

        if has_figures:
            stats['chunks_with_figures'] += 1
        if has_tables:
            stats['chunks_with_tables'] += 1

        if word_retention > 0.98:
            stats['content_preserved'] += 1

        # Classify level of cleaning
        size_change = abs(len(cleaned_text) - len(original_text)) / len(original_text)
        if size_change > 0.2:
            stats['major_cleaning'] += 1
        elif size_change > 0.05:
            stats['minor_cleaning'] += 1

        # Store results
        cleaned_chunk.update({
            'text': cleaned_text,
            'text_original': original_text,
            'cleaning_applied': cleaned_text != original_text,
            'word_retention_rate': word_retention,
            'content_flags': {
                'has_figures': has_figures,
                'has_tables': has_tables,
                'has_bullet_points': '•' in cleaned_text,
                'size_change_percent': size_change * 100
            }
        })

        cleaned_chunks.append(cleaned_chunk)

    # Save results
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_chunks, f, indent=2, ensure_ascii=False)

    # Detailed statistics
    print(f"Enhanced PMBOK Cleaning Results:")
    print(f"  Total chunks: {stats['total_chunks']}")
    print(f"  High content retention (>98%): {stats['content_preserved']}")
    print(f"  Chunks with figures: {stats['chunks_with_figures']}")
    print(f"  Chunks with tables: {stats['chunks_with_tables']}")
    print(f"  Major cleaning needed: {stats['major_cleaning']}")
    print(f"  Minor cleaning applied: {stats['minor_cleaning']}")
    print(f"  Content preservation rate: {stats['content_preserved']/stats['total_chunks']*100:.1f}%")

def show_detailed_comparison(chunk_idx: int, cleaned_file: str):
    """Show detailed before/after comparison for a specific chunk."""

    with open(cleaned_file, 'r') as f:
        chunks = json.load(f)

    if chunk_idx >= len(chunks):
        print(f"Chunk {chunk_idx} not found. Max index: {len(chunks)-1}")
        return

    chunk = chunks[chunk_idx]

    print(f"\nDETAILED COMPARISON - Chunk {chunk_idx}")
    print(f"Section: {chunk['section_number']} - {chunk['section_title']}")
    print(f"Content flags: {chunk['content_flags']}")
    print(f"Word retention: {chunk['word_retention_rate']:.3f}")

    print("\nORIGINAL:")
    print("=" * 70)
    print(chunk['text_original'])

    print("\nCLEANED:")
    print("=" * 70)
    print(chunk['text'])

    print("\n" + "="*70)

if __name__ == "__main__":
    import sys
    import os

    # Default paths
    input_file = "data/raw/PMBOK_chunks.json"
    output_file = "data/processed/PMBOK_chunks_enhanced_clean.json"

    # Create output directory
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # Process the file
    process_with_verification(input_file, output_file)

    # Show comparison if requested
    if "--compare" in sys.argv:
        try:
            chunk_idx = int(sys.argv[sys.argv.index("--compare") + 1])
            show_detailed_comparison(chunk_idx, output_file)
        except (IndexError, ValueError):
            # Show a chunk with tables for demonstration
            show_detailed_comparison(6, output_file)  # Chunk with system diagram