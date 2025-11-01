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
    
    # Build nodes (classes)
    nodes = []
    for class_name in sorted(classes_data.keys()):
        methods = sorted(classes_data[class_name])
        nodes.append({
            'id': class_name,
            'name': class_name,
            'methods': methods,
            'method_count': len(methods)
        })
    
    # Build links (method calls between classes)
    links = []
    for from_class, from_method, to_class, to_method in calls:
        links.append({
            'source': from_class,
            'target': to_class,
            'source_method': from_method,
            'target_method': to_method
        })
    
    return {'nodes': nodes, 'links': links}


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
        
        // Build method locations for connection calculations
        data.nodes.forEach(node => {{
            // Calculate width based on longest method or class name
            const longestText = Math.max(
                ...node.methods.map(m => m.length),
                node.name.length
            );
            // Use reasonable font width approximation (about 7px per character for 12px font)
            node.width = Math.max(longestText * 7 + 30, node.name.length * 8 + 20);
            node.height = node.method_count * 18 + 50; // Tighter spacing
            
            // Pre-calculate method positions relative to node center
            node.methodPositions = {{}};
            node.methods.forEach((method, i) => {{
                node.methodPositions[method] = {{
                    x: 0,
                    y: -node.height / 2 + 35 + i * 18
                }};
            }});
        }});
        
        const svg = d3.select("#graph")
            .append("svg")
            .attr("width", 1200)
            .attr("height", 800);
        
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
        
        // Add arrow marker
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
        
        // Create simulation
        const simulation = d3.forceSimulation(data.nodes)
            .force("link", d3.forceLink(data.links).id(d => d.id).distance(300))
            .force("charge", d3.forceManyBody().strength(-1200))
            .force("center", d3.forceCenter(600, 400))
            .force("collision", d3.forceCollide().radius(d => Math.max(d.width / 2, d.height / 2) + 40));
        
        // Draw links - connecting methods within nodes
        const link = container.append("g")
            .selectAll("line")
            .data(data.links)
            .enter().append("line")
            .attr("class", "link")
            .on("mouseover", function(event, d) {{
                d3.select(this).attr("class", "link hover");
                tooltip.style("display", "block")
                    .html(`<strong>${{d.source.name}}</strong>.${{d.source_method}}<br>→<br><strong>${{d.target.name}}</strong>.${{d.target_method}}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }})
            .on("mouseout", function(d) {{
                d3.select(this).attr("class", "link");
                tooltip.style("display", "none");
            }});
        
        // Draw nodes
        const node = container.append("g")
            .selectAll("g")
            .data(data.nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${{d.x || 0}},${{d.y || 0}})`);
        
        // Add rectangle background
        node.append("rect")
            .attr("width", d => d.width)
            .attr("height", d => d.height)
            .attr("x", d => -d.width / 2)
            .attr("y", d => -d.height / 2)
            .on("mouseover", function(event, d) {{
                d3.select(this).attr("fill", "rgba(41, 128, 185, 0.25)");
            }})
            .on("mouseout", function(event, d) {{
                d3.select(this).attr("fill", "rgba(52, 152, 219, 0.15)");
            }});
        
        // Add class name
        node.append("text")
            .attr("y", d => -d.height / 2 + 20)
            .text(d => d.name)
            .attr("text-anchor", "middle");
        
        // Add methods with IDs for connections
        node.append("g")
            .attr("class", "methods")
            .attr("transform", d => `translate(0,${{-d.height / 2 + 30}})`)
            .selectAll("text")
            .data(d => d.methods.map(m => ({{method: m, node: d}})))
            .enter().append("text")
            .attr("id", d => `method-${{d.node.id}}-${{d.method.replace(/_/g, '-')}}`)
            .attr("class", "method-text")
            .attr("y", (d, i) => i * 18 + 14)
            .text(d => d.method)
            .attr("text-anchor", "middle");
        
        // Update positions on simulation tick - with method connections
        simulation.on("tick", () => {{
            link
                .attr("x1", d => {{
                    const srcNode = typeof d.source === 'object' ? d.source : data.nodes.find(n => n.id === d.source);
                    const srcPos = srcNode.methodPositions[d.source_method];
                    return srcNode.x + srcPos.x;
                }})
                .attr("y1", d => {{
                    const srcNode = typeof d.source === 'object' ? d.source : data.nodes.find(n => n.id === d.source);
                    const srcPos = srcNode.methodPositions[d.source_method];
                    return srcNode.y + srcPos.y;
                }})
                .attr("x2", d => {{
                    const tgtNode = typeof d.target === 'object' ? d.target : data.nodes.find(n => n.id === d.target);
                    const tgtPos = tgtNode.methodPositions[d.target_method];
                    return tgtNode.x + tgtPos.x;
                }})
                .attr("y2", d => {{
                    const tgtNode = typeof d.target === 'object' ? d.target : data.nodes.find(n => n.id === d.target);
                    const tgtPos = tgtNode.methodPositions[d.target_method];
                    return tgtNode.y + tgtPos.y;
                }});
            
            node.attr("transform", d => `translate(${{d.x}},${{d.y}})`);
        }});
        
        // Add drag behavior
        node.call(d3.drag()
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
