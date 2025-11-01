// Node rendering attribute constants
const class_box_attrs = {
    width: 150,
    height: 40,
    x: -75,
    y: -20,
    rx: 8,
    fill: "rgba(52, 152, 219, 0.15)",
    stroke: "#2980b9",
    "stroke-width": 2
};

const class_name_attrs = {
    "text-anchor": "middle",
    fill: "#2c3e50",
    "font-weight": "bold",
    "font-size": "16px"
};

const method_box_attrs = {
    height: 30,
    rx: 6,
    fill: "rgba(46, 204, 113, 0.3)",
    stroke: "#27ae60",
    "stroke-width": 2
};

const method_text_attrs = {
    "text-anchor": "middle",
    fill: "#1e8449",
    "font-weight": "600",
    "font-size": "11px"
};

const calls_link_attrs = {
    stroke: "#7f8c8d",
    "stroke-width": 2,
    "stroke-dasharray": "3,3",
    "marker-end": "url(#arrowhead)"
};

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
    
    // Create container group for pan/zoom
    const container = svg.append("g");
    
    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            container.attr("transform", event.transform);
        });
    
    svg.call(zoom);
    
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
    
    // Separate class and method nodes
    const classNodes = data.nodes.filter(d => d.type === 'class');
    const methodNodes = data.nodes.filter(d => d.type === 'method');
    const containsLinks = data.links.filter(d => d.type === 'contains');
    const callsLinks = data.links.filter(d => d.type === 'calls');
    
    // Build map of class to methods
    const classMethodsMap = {};
    containsLinks.forEach(link => {
        if (!classMethodsMap[link.source]) {
            classMethodsMap[link.source] = [];
        }
        classMethodsMap[link.source].push(link.target);
    });
    
    // Build class-to-class links based on method calls (for invisible attraction force)
    const classClassLinks = [];
    const classPairMap = new Set();
    const classToIncomingCount = {};
    const classToOutgoingCount = {};
    callsLinks.forEach(link => {
        const sourceClass = data.nodes.find(n => n.id === link.source)?.class;
        const targetClass = data.nodes.find(n => n.id === link.target)?.class;
        if (sourceClass && targetClass && sourceClass !== targetClass) {
            // Track in/out counts for x-positioning
            classToOutgoingCount[sourceClass] = (classToOutgoingCount[sourceClass] || 0) + 1;
            classToIncomingCount[targetClass] = (classToIncomingCount[targetClass] || 0) + 1;
            
            const pairKey = [sourceClass, targetClass].sort().join('|');
            if (!classPairMap.has(pairKey)) {
                classPairMap.add(pairKey);
                classClassLinks.push({source: sourceClass, target: targetClass});
            }
        }
    });
    
    // Calculate x-positioning force for each node based on in/out ratio
    classNodes.forEach(node => {
        const outgoing = classToOutgoingCount[node.id] || 0;
        const incoming = classToIncomingCount[node.id] || 0;
        const total = outgoing + incoming;
        if (total > 0) {
            // Higher x-position for nodes with more incoming (sinks)
            // Lower x-position for nodes with more outgoing (sources)
            node._xWeight = incoming / total;
        } else {
            node._xWeight = 0.5; // No connections, stay in middle
        }
    });
    
    // Create simulation with only class nodes
    const simulation = d3.forceSimulation(classNodes)
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("center", d3.forceCenter(700, 500).strength(0.2))
        .force("classLink", d3.forceLink(classClassLinks)
            .id(d => d.id)
            .distance(200)
            .strength(0.3))
        .force("collision", d3.forceCollide().radius(100))
        .force("x", d3.forceX(d => {
            // Pull sinks right, sources left
            return 200 + (d._xWeight * 1000);
        }).strength(0.1));
    
    // Helper function to generate orthogonal path with horizontal entry/exit
    const generateLinkPath = (d) => {
        const sourceNode = data.nodes.find(n => n.id === d.source);
        const targetNode = data.nodes.find(n => n.id === d.target);
        const sourceClass = classNodes.find(c => c.id === sourceNode?.class);
        const targetClass = classNodes.find(c => c.id === targetNode?.class);
        
        if (!sourceClass || !targetClass || !sourceNode || !targetNode) {
            return "M 0,0";
        }
        
        const sourceMethods = classMethodsMap[sourceClass.id] || [];
        const targetMethods = classMethodsMap[targetClass.id] || [];
        const sourceMethodIndex = sourceMethods.indexOf(d.source);
        const targetMethodIndex = targetMethods.indexOf(d.target);
        
        const sourceMethod = methodNodes.find(m => m.id === d.source);
        const targetMethod = methodNodes.find(m => m.id === d.target);
        
        if (!sourceMethod || !targetMethod) {
            return "M 0,0";
        }
        
        const sourceMethodWidth = Math.max(sourceMethod.name.length * 7 + 10, 80);
        const targetMethodWidth = Math.max(targetMethod.name.length * 7 + 10, 80);
        
        // Source method center position
        const sourceX = sourceClass.x;
        const sourceY = sourceClass.y + 30 + (sourceMethodIndex * 40) + 15;
        
        // Target method center position
        const targetX = targetClass.x;
        const targetY = targetClass.y + 30 + (targetMethodIndex * 40) + 15;
        
        const isSameClass = sourceClass.id === targetClass.id;
        const horizontalOffset = 40; // Distance to extend horizontally before curving
        
        if (isSameClass) {
            // Same class: simple loop around the class box
            const startX = sourceX + sourceMethodWidth / 2;
            const startY = sourceY;
            const endX = targetX + targetMethodWidth / 2;
            const endY = targetY;
            
            // Exit horizontally
            const exitX = startX + horizontalOffset;
            const exitY = startY;
            
            // Determine if target is above or below source
            const isTargetAbove = targetY < sourceY;
            
            // Calculate loop height - go above or below the class box
            const classBoxTop = sourceClass.y - 20;
            const classBoxBottom = sourceClass.y + 30 + (classMethodsMap[sourceClass.id]?.length || 0) * 40;
            const loopHeight = isTargetAbove 
                ? classBoxTop - 50  // Loop above class
                : classBoxBottom + 50;  // Loop below class
            
            // Simple arc point
            const arcX = exitX + 60;
            const arcY = loopHeight;
            
            // Enter horizontally
            const enterX = endX + horizontalOffset;
            const enterY = endY;
            
            // Simple path: straight out, curve up/down, curve back, straight in
            // Use two connected curves for the loop
            const ctrl1X = exitX;
            const ctrl1Y = isTargetAbove ? exitY - 40 : exitY + 40;
            const ctrl2X = arcX - 20;
            const ctrl2Y = arcY;
            
            const ctrl3X = arcX + 20;
            const ctrl3Y = arcY;
            const ctrl4X = enterX;
            const ctrl4Y = isTargetAbove ? enterY - 40 : enterY + 40;
            
            return `M ${startX},${startY} L ${exitX},${exitY} C ${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${arcX},${arcY} C ${ctrl3X},${ctrl3Y} ${ctrl4X},${ctrl4Y} ${enterX},${enterY} L ${endX},${endY}`;
        } else {
            // Different classes: horizontal exit, simple curve, horizontal entry
            const sourceRightX = sourceX + sourceMethodWidth / 2;
            const sourceRightY = sourceY;
            const targetLeftX = targetX - targetMethodWidth / 2;
            const targetLeftY = targetY;
            
            // Exit point (horizontal offset from source)
            const exitX = sourceRightX + horizontalOffset;
            const exitY = sourceRightY;
            
            // Entry point (horizontal offset from target)
            const entryX = targetLeftX - horizontalOffset;
            const entryY = targetLeftY;
            
            // Simple single bezier curve from exit to entry
            // Use a gentle arc that curves toward the midpoint
            const dx = entryX - exitX;
            const dy = entryY - exitY;
            const midX = (exitX + entryX) / 2;
            const midY = (exitY + entryY) / 2;
            
            // Control points create a gentle curve: stay horizontal near endpoints, curve in middle
            const ctrl1X = exitX + dx * 0.3;
            const ctrl1Y = exitY; // Keep horizontal initially
            const ctrl2X = entryX - dx * 0.3;
            const ctrl2Y = midY; // Curve toward midpoint vertically
            
            // Single smooth bezier curve
            return `M ${sourceRightX},${sourceRightY} L ${exitX},${exitY} C ${ctrl1X},${ctrl1Y} ${ctrl2X},${ctrl2Y} ${entryX},${entryY} L ${targetLeftX},${targetLeftY}`;
        }
    };
    
    // Draw calls links (method->method) - curved paths with arrows
    const callsLink = container.append("g")
        .attr("class", "calls-links")
        .selectAll("path")
        .data(callsLinks)
        .enter().append("path")
        .attr("class", "link")
        .attrs(calls_link_attrs)
        .attr("fill", "none") // Paths need fill:none for stroke to show
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
    
    // Draw class groups with methods inside
    const classNode = container.append("g")
        .attr("class", "class-groups")
        .selectAll("g")
        .data(classNodes)
        .enter().append("g")
        .attr("class", "class-group")
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
    
    // Class name box
    classNode.append("rect")
        .attr("class", "class-box")
        .attrs(class_box_attrs);
    
    classNode.append("text")
        .attr("class", "class-name")
        .attrs(class_name_attrs)
        .text(d => d.name);
    
    // Method boxes inside each class group
    classNode.each(function(classD) {
        const methods = classMethodsMap[classD.id] || [];
        const methodGroup = d3.select(this).append("g").attr("class", "methods");
        
        methods.forEach((methodId, i) => {
            const method = methodNodes.find(m => m.id === methodId);
            if (method) {
                const methodBox = methodGroup.append("g")
                    .attr("class", "method-box")
                    .datum(method);
                
                methodBox.append("rect")
                    .attr("width", d => Math.max(d.name.length * 7 + 10, 80))
                    .attr("x", d => -Math.max(d.name.length * 7 + 10, 80) / 2)
                    .attr("y", 30 + (i * 40))
                    .attrs(method_box_attrs);
                
                methodBox.append("text")
                    .attrs(method_text_attrs)
                    .attr("x", 0)
                    .attr("y", 47 + (i * 40))
                    .text(d => d.name);
            }
        });
    });
    
    // Update positions on simulation tick
    simulation.on("tick", () => {
        // Constrain nodes within bounds
        const margin = 50;
        classNodes.forEach(node => {
            node.x = Math.max(margin, Math.min(1400 - margin, node.x));
            node.y = Math.max(margin, Math.min(1000 - margin, node.y));
        });
        
        callsLink
            .attr("d", d => generateLinkPath(d));
        
        classNode.attr("transform", d => `translate(${d.x},${d.y})`);
    });
    
    // Zoom to fit when simulation ends
    simulation.on("end", () => {
        const bounds = container.node().getBBox();
        const fullWidth = +svg.attr("width");
        const fullHeight = +svg.attr("height");
        const width = bounds.width;
        const height = bounds.height;
        const midX = bounds.x + width / 2;
        const midY = bounds.y + height / 2;
        
        if (width && height) {
            const scale = Math.min(fullWidth / width, fullHeight / height);
            const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
            
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        }
    });
}

// Load graph on page load
loadGraph();
