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
    callsLinks.forEach(link => {
        const sourceClass = data.nodes.find(n => n.id === link.source)?.class;
        const targetClass = data.nodes.find(n => n.id === link.target)?.class;
        if (sourceClass && targetClass && sourceClass !== targetClass) {
            const pairKey = [sourceClass, targetClass].sort().join('|');
            if (!classPairMap.has(pairKey)) {
                classPairMap.add(pairKey);
                classClassLinks.push({source: sourceClass, target: targetClass});
            }
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
        .force("collision", d3.forceCollide().radius(100));
    
    // Draw calls links (method->method) - dashed, with arrows
    const callsLink = container.append("g")
        .attr("class", "calls-links")
        .selectAll("line")
        .data(callsLinks)
        .enter().append("line")
        .attr("class", "link")
        .attr("stroke", "#7f8c8d")
        .attr("stroke-width", 2)
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
        .attr("width", 150)
        .attr("height", 40)
        .attr("x", -75)
        .attr("y", -20)
        .attr("rx", 8)
        .attr("fill", "rgba(52, 152, 219, 0.15)")
        .attr("stroke", "#2980b9")
        .attr("stroke-width", 2);
    
    classNode.append("text")
        .attr("class", "class-name")
        .attr("text-anchor", "middle")
        .text(d => d.name)
        .attr("fill", "#2c3e50")
        .attr("font-weight", "bold")
        .attr("font-size", "16px");
    
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
                    .attr("height", 30)
                    .attr("x", d => -Math.max(d.name.length * 7 + 10, 80) / 2)
                    .attr("y", 30 + (i * 40))
                    .attr("rx", 6)
                    .attr("fill", "rgba(46, 204, 113, 0.3)")
                    .attr("stroke", "#27ae60")
                    .attr("stroke-width", 2);
                
                methodBox.append("text")
                    .attr("text-anchor", "middle")
                    .text(d => d.name)
                    .attr("fill", "#1e8449")
                    .attr("font-weight", "600")
                    .attr("font-size", "11px")
                    .attr("x", 0)
                    .attr("y", 47 + (i * 40));
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
            .attr("x1", d => {
                // Find method position from source class group
                const sourceClass = classNodes.find(c => c.id === data.nodes.find(n => n.id === d.source)?.class);
                if (sourceClass) {
                    const methods = classMethodsMap[sourceClass.id] || [];
                    const methodIndex = methods.indexOf(d.source);
                    const method = methodNodes.find(m => m.id === d.source);
                    if (method) {
                        const methodBox = methodNodes.find(m => m.id === d.source);
                        const methodWidth = Math.max(method.name.length * 7 + 10, 80);
                        return sourceClass.x + methodWidth / 2;
                    }
                }
                return d.source.x;
            })
            .attr("y1", d => {
                const sourceClass = classNodes.find(c => c.id === data.nodes.find(n => n.id === d.source)?.class);
                if (sourceClass) {
                    const methods = classMethodsMap[sourceClass.id] || [];
                    const methodIndex = methods.indexOf(d.source);
                    return sourceClass.y + 30 + (methodIndex * 40) + 15;
                }
                return d.source.y;
            })
            .attr("x2", d => {
                const targetClass = classNodes.find(c => c.id === data.nodes.find(n => n.id === d.target)?.class);
                if (targetClass) {
                    const methods = classMethodsMap[targetClass.id] || [];
                    const methodIndex = methods.indexOf(d.target);
                    const method = methodNodes.find(m => m.id === d.target);
                    if (method) {
                        const methodWidth = Math.max(method.name.length * 7 + 10, 80);
                        return targetClass.x - methodWidth / 2;
                    }
                }
                return d.target.x;
            })
            .attr("y2", d => {
                const targetClass = classNodes.find(c => c.id === data.nodes.find(n => n.id === d.target)?.class);
                if (targetClass) {
                    const methods = classMethodsMap[targetClass.id] || [];
                    const methodIndex = methods.indexOf(d.target);
                    return targetClass.y + 30 + (methodIndex * 40) + 15;
                }
                return d.target.y;
            });
        
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
