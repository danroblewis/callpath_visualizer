"""
Generate D3.js network graph from tracer output showing call paths between classes.
"""

from tracer_demo import CallTracer
import sys
from pathlib import Path
from collections import defaultdict
import json


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
        # Only track inter-class calls with a parent on the stack
        if event.get('caller') and event.get('class') and event['caller'].get('class'):
            from_class = event['caller']['class']
            from_method = event['caller']['function']
            to_class = event['class']
            to_method = event['function']
            
            # Skip self-calls within the same class
            if from_class != to_class:
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


def generate_html(data_json):
    """Generate HTML with D3.js network graph."""
    return f"""<!DOCTYPE html>
<html>
<head>
    <title>Call Path Visualization</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {{
            margin: 0;
            padding: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }}
        h1 {{
            margin: 0 0 10px 0;
            color: #2c3e50;
            font-size: 32px;
        }}
        .subtitle {{
            color: #7f8c8d;
            margin-bottom: 30px;
            font-size: 14px;
        }}
        svg {{
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            background: white;
        }}
        .node rect {{
            fill: rgba(52, 152, 219, 0.15);
            stroke: #2980b9;
            stroke-width: 2;
            rx: 8;
        }}
        .node rect:hover {{
            fill: rgba(41, 128, 185, 0.25);
        }}
        .node text {{
            pointer-events: none;
            font-size: 12px;
            font-weight: bold;
            fill: #2c3e50;
        }}
        .method-text {{
            font-size: 11px;
            fill: #34495e;
        }}
        .link {{
            stroke: #7f8c8d;
            stroke-width: 2;
            fill: none;
            marker-end: url(#arrowhead);
        }}
        .link:hover {{
            stroke: #e74c3c;
            stroke-width: 3;
        }}
        .tooltip {{
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            pointer-events: none;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }}
        .legend {{
            margin-top: 20px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }}
        .legend h3 {{
            margin-top: 0;
            color: #2c3e50;
        }}
        .legend-item {{
            margin: 10px 0;
            display: flex;
            align-items: center;
        }}
        .legend-color {{
            width: 20px;
            height: 20px;
            background: #3498db;
            margin-right: 10px;
            border-radius: 4px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Call Path Visualization</h1>
        <p class="subtitle">Runtime call traces from Domain-Driven Design project</p>
        
        <div id="graph"></div>
        
        <div class="legend">
            <h3>Legend</h3>
            <div class="legend-item">
                <div class="legend-color"></div>
                <span><strong>Blue boxes:</strong> Classes with their methods</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #7f8c8d;"></div>
                <span><strong>Gray arrows:</strong> Method calls between classes</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #e74c3c;"></div>
                <span><strong>Red arrows:</strong> Hover over edge to highlight</span>
            </div>
        </div>
    </div>

    <div class="tooltip" id="tooltip" style="display: none;"></div>

    <script>
        const data = {json.dumps(data_json)};
        
        const svg = d3.select("#graph")
            .append("svg")
            .attr("width", 1400)
            .attr("height", 1000);
        
        const tooltip = d3.select("#tooltip");
        
        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {{
                container.attr("transform", event.transform);
            }});
        
        svg.call(zoom);
        
        // Create container group for pan/zoom
        const container = svg.append("g");
        
        // Add arrow marker for method calls
        container.append("defs").append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 5)
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#7f8c8d");
        
        // Create simulation with different distances for different link types
        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links)
                .id(d => d.id)
                .distance(d => d.type === 'contains' ? 40 : 150))
            .force("charge", d3.forceManyBody().strength(-800))
            .force("center", d3.forceCenter(700, 500));
        
        // Separate class and method nodes for different styling
        const classNodes = data.nodes.filter(d => d.type === 'class');
        const methodNodes = data.nodes.filter(d => d.type === 'method');
        const containsLinks = data.links.filter(d => d.type === 'contains');
        const callsLinks = data.links.filter(d => d.type === 'calls');
        
        // Draw contains links (class->method) - solid, light gray
        const containsLink = container.append("g")
            .attr("class", "contains-links")
            .selectAll("line")
            .data(containsLinks)
            .enter().append("line")
            .attr("stroke", "#95a5a6")
            .attr("stroke-width", 1.5);
        
        // Draw calls links (method->method) - dashed, with arrows
        const callsLink = container.append("g")
            .attr("class", "calls-links")
            .selectAll("line")
            .data(callsLinks)
            .enter().append("line")
            .attr("class", "link")
            .attr("stroke-dasharray", "3,3")
            .attr("marker-end", "url(#arrowhead)")
            .on("mouseover", function(event, d) {{
                d3.select(this).attr("class", "link hover");
                const srcMethod = d.source.name || data.nodes.find(n => n.id === d.source).name;
                const tgtMethod = d.target.name || data.nodes.find(n => n.id === d.target).name;
                const srcClass = d.source.class || data.nodes.find(n => n.id === d.source)?.class || '';
                const tgtClass = d.target.class || data.nodes.find(n => n.id === d.target)?.class || '';
                tooltip.style("display", "block")
                    .html(`<strong>${{srcClass}}</strong>.${{srcMethod}}<br>→<br><strong>${{tgtClass}}</strong>.${{tgtMethod}}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }})
            .on("mouseout", function(d) {{
                d3.select(this).attr("class", "link");
                tooltip.style("display", "none");
            }});
        
        // Draw class nodes
        const classNode = container.append("g")
            .attr("class", "class-nodes")
            .selectAll("g")
            .data(classNodes)
            .enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", function(event, d) {{
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }})
                .on("drag", function(event, d) {{
                    d.fx = event.x;
                    d.fy = event.y;
                }})
                .on("end", function(event, d) {{
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }}));
        
        // Class node styling
        classNode.append("rect")
            .attr("width", 120)
            .attr("height", 40)
            .attr("x", -60)
            .attr("y", -20)
            .attr("rx", 8)
            .attr("fill", "rgba(52, 152, 219, 0.15)")
            .attr("stroke", "#2980b9")
            .attr("stroke-width", 2);
        
        classNode.append("text")
            .attr("text-anchor", "middle")
            .text(d => d.name)
            .attr("fill", "#2c3e50")
            .attr("font-weight", "bold")
            .attr("font-size", "16px");
        
        // Draw method nodes
        const methodNode = container.append("g")
            .attr("class", "method-nodes")
            .selectAll("g")
            .data(methodNodes)
            .enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", function(event, d) {{
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                }})
                .on("drag", function(event, d) {{
                    d.fx = event.x;
                    d.fy = event.y;
                }})
                .on("end", function(event, d) {{
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }}));
        
        // Method node styling - smaller
        methodNode.append("rect")
            .attr("width", d => Math.max(d.name.length * 7 + 10, 80))
            .attr("height", 30)
            .attr("x", d => -Math.max(d.name.length * 7 + 10, 80) / 2)
            .attr("y", -15)
            .attr("rx", 6)
            .attr("fill", "rgba(46, 204, 113, 0.3)")
            .attr("stroke", "#27ae60")
            .attr("stroke-width", 2);
        
        methodNode.append("text")
            .attr("text-anchor", "middle")
            .text(d => d.name)
            .attr("fill", "#1e8449")
            .attr("font-weight", "600")
            .attr("font-size", "11px");
        
        // Update positions on simulation tick
        simulation.on("tick", () => {{
            containsLink
                .attr("x1", d => typeof d.source === 'object' ? d.source.x : data.nodes.find(n => n.id === d.source).x)
                .attr("y1", d => typeof d.source === 'object' ? d.source.y : data.nodes.find(n => n.id === d.source).y)
                .attr("x2", d => typeof d.target === 'object' ? d.target.x : data.nodes.find(n => n.id === d.target).x)
                .attr("y2", d => typeof d.target === 'object' ? d.target.y : data.nodes.find(n => n.id === d.target).y);
            
            callsLink
                .attr("x1", d => typeof d.source === 'object' ? d.source.x : data.nodes.find(n => n.id === d.source).x)
                .attr("y1", d => typeof d.source === 'object' ? d.source.y : data.nodes.find(n => n.id === d.source).y)
                .attr("x2", d => typeof d.target === 'object' ? d.target.x : data.nodes.find(n => n.id === d.target).x)
                .attr("y2", d => typeof d.target === 'object' ? d.target.y : data.nodes.find(n => n.id === d.target).y);
            
            classNode.attr("transform", d => `translate(${{d.x}},${{d.y}})`);
            methodNode.attr("transform", d => `translate(${{d.x}},${{d.y}})`);
        }});
    </script>
</body>
</html>
"""


if __name__ == '__main__':
    # Use DDD project
    sys.path.insert(0, str(Path(__file__).parent / 'sample_ddd_project'))
    
    from domain.entities.user import User
    from domain.entities.product import Product
    from infrastructure.repositories.user_repository import UserRepository
    from infrastructure.repositories.order_repository import OrderRepository
    from infrastructure.repositories.product_repository import ProductRepository
    from domain.services.order_service import OrderService
    from domain.services.inventory_service import InventoryService
    from application.use_cases.create_order_use_case import CreateOrderUseCase
    
    # Create tracer
    tracer = CallTracer()
    tracer.start_tracing()
    
    # Execute test scenario
    user_repo = UserRepository()
    order_repo = OrderRepository()
    product_repo = ProductRepository()
    inventory_service = InventoryService(product_repo)
    order_service = OrderService(order_repo, product_repo, inventory_service)
    
    use_case = CreateOrderUseCase(order_service, inventory_service)
    
    user = User(1, "alice@example.com", "Alice")
    product = Product(1, "Widget", 10.0, 5)
    product_repo.save(product)
    
    order_items = [{'product': product, 'quantity': 2}]
    result = use_case.execute(user, order_items)
    
    # Stop tracing
    events = tracer.stop_tracing()
    
    # Generate D3 data
    graph_data = generate_d3_data(events)
    
    # Generate HTML
    html_content = generate_html(graph_data)
    
    # Save HTML file
    html_file = 'call_paths.html'
    with open(html_file, 'w') as f:
        f.write(html_content)
    print(f"Generated {html_file}")
    
    # Print summary
    print(f"Captured {len(events)} calls")
    print(f"Classes: {len(graph_data['nodes'])}")
    print(f"Method call edges: {len(graph_data['links'])}")
