"""Process tracer events into D3.js network graph data."""

from collections import defaultdict
from pathlib import Path
import sys

# Add parent directory to path for static analyzer import
sys.path.insert(0, str(Path(__file__).parent.parent))

from static_analyzer import find_classes_and_methods


def generate_d3_data(tracer_events, track_module_calls=False, project_root=None):
    """
    Convert tracer events to D3.js network graph format.
    
    Args:
        tracer_events: List of trace events from CallTracer
        track_module_calls: If True, include calls from module-level code (e.g., __init__ from scripts).
                          Default False to avoid showing incorrect module-to-class links.
        project_root: Optional root directory for static analysis to find all classes/methods.
                     If provided, includes classes and methods that exist but were never called.
    """
    # Build class -> methods mapping from trace events
    classes_data = defaultdict(set)
    called_methods = set()  # Track which methods were actually called
    
    for event in tracer_events:
        if event.get('class'):
            classes_data[event['class']].add(event['function'])
            called_methods.add((event['class'], event['function']))
    
    # If project_root is provided, also find all classes and methods via static analysis
    if project_root:
        static_classes = find_classes_and_methods(project_root)
        
        # Merge static analysis with trace data
        for class_name, methods in static_classes.items():
            if class_name not in classes_data:
                classes_data[class_name] = set()
            classes_data[class_name].update(methods)
    
    # Build call relationships
    calls = []
    for event in tracer_events:
        # Track all method calls (must have a class to be a method call)
        if event.get('class'):
            to_class = event['class']
            to_method = event['function']
            
            # Determine the caller - handle both class-based callers and module-level callers
            caller = event.get('caller')
            if caller:
                # Caller exists - check if it has a class or is module-level
                if caller.get('class'):
                    from_class = caller['class']
                    from_method = caller['function']
                else:
                    # Module-level caller - use filename as identifier
                    if not track_module_calls:
                        # Skip module-level callers when flag is disabled
                        continue
                    caller_filename = caller.get('filename', 'module')
                    from_class = f"<module:{Path(caller_filename).stem}>" if caller_filename else "<module>"
                    from_method = caller.get('function', '<module>')
                    # Add module-level "class" and its "method" to the data
                    classes_data[from_class].add(from_method)
            else:
                # No caller in stack - this is a top-level call (module-level instantiation)
                if not track_module_calls:
                    # Skip module-level calls when flag is disabled
                    continue
                # Only create links if we have entry_script - we need to know which script initiated this
                entry_script = event.get('entry_script')
                if entry_script:
                    script_path = Path(entry_script)
                    from_class = f"<module:{script_path.stem}>"
                    from_method = '<module>'  # Top-level code execution
                    # Add module-level "class" to the data
                    classes_data[from_class].add(from_method)
                else:
                    # No entry_script - we can't reliably determine the caller
                    # Skip creating this link to avoid incorrect attribution
                    continue
            
            # Include all calls, including same-class method calls and module-to-class calls
            calls.append((from_class, from_method, to_class, to_method))
    
    # Remove duplicates
    calls = list(set(calls))
    
    # Build nodes: classes + methods as separate nodes
    nodes = []
    method_nodes = []
    
    for class_name in sorted(classes_data.keys()):
        methods = sorted(classes_data[class_name])
        
        # Check if class was used (has any called methods)
        class_was_used = any((class_name, method) in called_methods for method in methods)
        
        # Add class node with usage indicator
        nodes.append({
            'id': class_name,
            'name': class_name,
            'type': 'class',
            'method_count': len(methods),
            'was_used': class_was_used
        })
        
        # Add method nodes with usage indicator
        for method in methods:
            method_id = f"{class_name}::{method}"
            method_was_called = (class_name, method) in called_methods
            
            method_nodes.append({
                'id': method_id,
                'name': method,
                'type': 'method',
                'class': class_name,
                'was_called': method_was_called
            })
    
    # Combine all nodes
    all_nodes = nodes + method_nodes
    
    # Build links: class->method links + method->method links
    links = []
    
    # First, add class-to-method links
    for method_node in method_nodes:
        links.append({
            'source': method_node['class'],
            'target': method_node['id'],
            'type': 'contains',
            'source_method': None,
            'target_method': None
        })
    
    # Then, add method-to-method call links
    for from_class, from_method, to_class, to_method in calls:
        from_method_id = f"{from_class}::{from_method}"
        to_method_id = f"{to_class}::{to_method}"
        links.append({
            'source': from_method_id,
            'target': to_method_id,
            'type': 'calls',
            'source_method': from_method,
            'target_method': to_method
        })
    
    return {'nodes': all_nodes, 'links': links}

