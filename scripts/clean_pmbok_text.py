#!/usr/bin/env python3
"""
PMBOK Text Cleaning Script
Removes formatting artifacts while preserving all actual content and sentence structure.
"""

import json
import re
from typing import Dict, Any
import copy

def clean_pmbok_text(text: str) -> str:
    """
    Clean PMBOK text by removing formatting artifacts while preserving all actual content.

    This function:
    - Removes ASCII table borders and structural markup
    - Preserves all semantic content and definitions
    - Maintains sentence structure and flow
    - Keeps bullet points and lists readable
    - Preserves figure references with context
    """

    # Step 1: Remove ASCII table borders (structural markup only)
    # Remove horizontal borders like +-------+ and +=======+
    text = re.sub(r'\+[-=]+\+\n?', '', text)

    # Remove table column separators but preserve content between them
    # This regex captures content between | symbols and preserves it
    def preserve_table_content(match):
        content = match.group(1).strip()
        if content and not re.match(r'^[-=\s]+$', content):  # If there's actual content
            return content + ' '
        return ''

    text = re.sub(r'\|\s*([^|]*?)\s*\|', preserve_table_content, text)

    # Step 2: Clean up bullet points while preserving content
    # Convert special bullet points to standard ones
    text = re.sub(r'▶\s*', '• ', text)

    # Step 3: Preserve figure references but make them more readable
    # Keep figure references but clean up the formatting
    text = re.sub(r'Figure (\d+-\d+)\.?\s*([^.]*\.)', r'Figure \1: \2', text)

    # Step 4: Fix spacing issues without merging sentences
    # Remove excessive whitespace while preserving paragraph breaks
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Multiple line breaks -> double
    text = re.sub(r'[ \t]+', ' ', text)  # Multiple spaces -> single space
    text = re.sub(r'^\s+|\s+$', '', text, flags=re.MULTILINE)  # Trim lines

    # Step 5: Fix broken sentences caused by formatting
    # Fix cases where sentences were split by formatting
    text = re.sub(r'(\w)\s*\n\s*(\w)', r'\1 \2', text)  # Rejoin split words

    # Step 6: Normalize list formatting
    # Ensure consistent spacing around bullet points
    text = re.sub(r'\n•\s*', '\n• ', text)
    text = re.sub(r'^•\s*', '• ', text, flags=re.MULTILINE)

    # Step 7: Clean up definition lists
    # Preserve definition structure but clean formatting
    text = re.sub(r'▶\s*([^.]+)\.\s*([^▶\n]+)', r'• \1: \2', text)

    # Step 8: Final cleanup
    # Remove any remaining isolated formatting characters
    text = re.sub(r'^\s*[+|=-]+\s*$', '', text, flags=re.MULTILINE)

    # Normalize paragraph spacing
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()

def create_cleaned_chunks(input_file: str, output_file: str) -> None:
    """
    Process PMBOK chunks file and create a cleaned version.

    Args:
        input_file: Path to original chunks JSON file
        output_file: Path for cleaned chunks JSON file
    """

    with open(input_file, 'r', encoding='utf-8') as f:
        chunks = json.load(f)

    cleaned_chunks = []
    stats = {
        'total_chunks': len(chunks),
        'chunks_with_figures': 0,
        'chunks_with_tables': 0,
        'chunks_cleaned': 0
    }

    for chunk in chunks:
        # Create a copy to preserve original structure
        cleaned_chunk = copy.deepcopy(chunk)

        original_text = chunk['text']
        cleaned_text = clean_pmbok_text(original_text)

        # Track what we're cleaning
        has_figures = 'Figure' in original_text
        has_tables = '+' in original_text and '|' in original_text

        if has_figures:
            stats['chunks_with_figures'] += 1
        if has_tables:
            stats['chunks_with_tables'] += 1
        if cleaned_text != original_text:
            stats['chunks_cleaned'] += 1

        # Add both versions for comparison/fallback
        cleaned_chunk['text'] = cleaned_text
        cleaned_chunk['text_original'] = original_text
        cleaned_chunk['cleaning_applied'] = cleaned_text != original_text
        cleaned_chunk['content_flags'] = {
            'has_figures': has_figures,
            'has_tables': has_tables,
            'has_bullet_points': '•' in cleaned_text or '▶' in original_text
        }

        cleaned_chunks.append(cleaned_chunk)

    # Save cleaned version
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_chunks, f, indent=2, ensure_ascii=False)

    # Print statistics
    print(f"PMBOK Cleaning Statistics:")
    print(f"  Total chunks processed: {stats['total_chunks']}")
    print(f"  Chunks with figures: {stats['chunks_with_figures']}")
    print(f"  Chunks with tables: {stats['chunks_with_tables']}")
    print(f"  Chunks cleaned: {stats['chunks_cleaned']}")
    print(f"  Cleaning rate: {stats['chunks_cleaned']/stats['total_chunks']*100:.1f}%")
    print(f"  Output saved to: {output_file}")

def compare_before_after(original_text: str, cleaned_text: str) -> None:
    """Helper function to compare original and cleaned text for review."""
    print("ORIGINAL:")
    print("-" * 50)
    print(original_text[:500] + "..." if len(original_text) > 500 else original_text)
    print("\nCLEANED:")
    print("-" * 50)
    print(cleaned_text[:500] + "..." if len(cleaned_text) > 500 else cleaned_text)
    print("\n" + "="*70)

if __name__ == "__main__":
    import sys

    # Default paths
    input_file = "data/raw/PMBOK_chunks.json"
    output_file = "data/processed/PMBOK_chunks_cleaned.json"

    # Create output directory if it doesn't exist
    import os
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    # Process the file
    create_cleaned_chunks(input_file, output_file)

    # Show a sample comparison
    if len(sys.argv) > 1 and sys.argv[1] == "--show-sample":
        with open(input_file, 'r') as f:
            original_chunks = json.load(f)
        with open(output_file, 'r') as f:
            cleaned_chunks = json.load(f)

        # Find a chunk with lots of formatting to show the difference
        for i, (orig, clean) in enumerate(zip(original_chunks, cleaned_chunks)):
            if orig['text'] != clean['text'] and len(orig['text']) > 200:
                print(f"\nSAMPLE COMPARISON - Chunk {i} (Section {orig['section_number']}):")
                compare_before_after(orig['text'], clean['text'])
                break