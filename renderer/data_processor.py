"""Process tracer events into D3.js network graph data."""

from collections import defaultdict


def generate_d3_data(tracer_events):
    """Convert tracer events to D3.js network graph format."""
    
    # Build class -> methods mapping
    classes_data = defaultdict(set)
    for event in tracer_events:
        if event.get('class'):
            classes_data[event['class']].add(event['function'])
    
    # Build call relationships
    calls = []
    for event in tracer_events:
        # Track all method calls with a parent on the stack (including same-class calls)
        if event.get('caller') and event.get('class') and event['caller'].get('class'):
            from_class = event['caller']['class']
            from_method = event['caller']['function']
            to_class = event['class']
            to_method = event['function']
            
            # Include all calls, including same-class method calls
            calls.append((from_class, from_method, to_class, to_method))
    
    # Remove duplicates
    calls = list(set(calls))
    
    # Build nodes: classes + methods as separate nodes
    nodes = []
    method_nodes = []
    
    for class_name in sorted(classes_data.keys()):
        methods = sorted(classes_data[class_name])
        # Add class node
        nodes.append({
            'id': class_name,
            'name': class_name,
            'type': 'class',
            'method_count': len(methods)
        })
        
        # Add method nodes
        for method in methods:
            method_id = f"{class_name}::{method}"
            method_nodes.append({
                'id': method_id,
                'name': method,
                'type': 'method',
                'class': class_name
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

