"""Script to generate trace data JSON file from the DDD sample scenario."""

import json
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from trace_runner import run_traced_script
from renderer.data_processor import generate_d3_data


def main():
    """Generate trace data and save to JSON file."""
    project_root = str(Path(__file__).parent / 'sample_ddd_project')
    script_path = str(Path(__file__).parent / 'run_ddd_scenario.py')
    output_file = Path(__file__).parent / 'renderer' / 'static' / 'trace_data.json'
    
    print(f"Running traced script: {script_path}")
    print(f"Project root: {project_root}")
    
    # Run script with tracing (tracing starts before script loads and stops after execution)
    events = run_traced_script(script_path, project_root=project_root)
    
    print(f"Captured {len(events)} trace events")
    
    # Generate D3 data
    graph_data = generate_d3_data(events)
    
    # Ensure output directory exists
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Write JSON file
    with open(output_file, 'w') as f:
        json.dump(graph_data, f, indent=2)
    
    print(f"Trace data saved to: {output_file}")
    print(f"Generated {len(graph_data['nodes'])} nodes and {len(graph_data['links'])} links")


if __name__ == '__main__':
    main()

