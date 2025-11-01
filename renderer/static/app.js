async function loadGraph() {
    try {
        const response = await fetch('/api/trace');
        const data = await response.json();
        renderGraph(data);
    } catch (error) {
        document.getElementById('graph').innerHTML = 
            '<div class="loading">Error loading graph: ' + error.message + '</div>';
    }
}

function renderGraph(data) {
    // Clear loading message
    document.getElementById('graph').innerHTML = '';
    
    const svg = d3.select("#graph")
        .append("svg")
        .attr("width", 1400)
        .attr("height", 1000);
    
    const tooltip = d3.select("#tooltip");
    
    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            container.attr("transform", event.transform);
        });
    
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
        .on("mouseover", function(event, d) {
            d3.select(this).attr("class", "link hover");
            const srcMethod = d.source.name || data.nodes.find(n => n.id === d.source).name;
            const tgtMethod = d.target.name || data.nodes.find(n => n.id === d.target).name;
            const srcClass = d.source.class || data.nodes.find(n => n.id === d.source)?.class || '';
            const tgtClass = d.target.class || data.nodes.find(n => n.id === d.target)?.class || '';
            tooltip.style("display", "block")
                .html(`<strong>${srcClass}</strong>.${srcMethod}<br>→<br><strong>${tgtClass}</strong>.${tgtMethod}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(d) {
            d3.select(this).attr("class", "link");
            tooltip.style("display", "none");
        });
    
    // Draw class nodes
    const classNode = container.append("g")
        .attr("class", "class-nodes")
        .selectAll("g")
        .data(classNodes)
        .enter().append("g")
        .attr("class", "node")
        .call(d3.drag()
            .on("start", function(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", function(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", function(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));
    
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
            .on("start", function(event, d) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", function(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", function(event, d) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));
    
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
    simulation.on("tick", () => {
        containsLink
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        
        callsLink
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        
        classNode.attr("transform", d => `translate(${d.x},${d.y})`);
        methodNode.attr("transform", d => `translate(${d.x},${d.y})`);
    });
}

// Load graph on page load
loadGraph();

