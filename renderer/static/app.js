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
    "stroke-width": 2,
    "stroke-dasharray": "3,3",
    "marker-end": "url(#arrowhead)"
};

const arrowhead_marker_attrs = {
    id: "arrowhead",
    viewBox: "0 -5 10 10",
    refX: 5,
    refY: 0,
    markerWidth: 6,
    markerHeight: 6,
    orient: "auto"
};

const arrowhead_path_attrs = {
    d: "M0,-5L10,0L0,5",
    fill: "#7f8c8d"
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
    
    // Track current force value for Ctrl+scroll adjustment
    let currentForceStrength = -1000;
    
    // Add zoom behavior with Ctrl/Cmd+scroll override for force adjustment
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            // Don't zoom if Ctrl/Cmd is held (we'll use that for force adjustment)
            if (event.sourceEvent && (event.sourceEvent.ctrlKey || event.sourceEvent.metaKey)) {
                return;
            }
            container.attr("transform", event.transform);
        })
        .filter(function(event) {
            // Allow zoom with wheel if Ctrl/Cmd is NOT held
            if (event.type === 'wheel') {
                return !event.ctrlKey && !event.metaKey;
            }
            // Allow other zoom gestures (pinch, etc.)
            return true;
        });
    
    svg.call(zoom);
    
    const defs = container.append("defs");
    
    // Add arrow marker for method calls
    defs.append("marker")
        .attrs(arrowhead_marker_attrs)
        .append("path")
        .attrs(arrowhead_path_attrs);
    
    // We'll create individual gradients for each link dynamically based on their paths
    
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
    
    // Build map of outgoing links per method (for staggering exit points)
    const methodOutgoingLinksMap = {};
    callsLinks.forEach(link => {
        const sourceMethodId = link.source;
        if (!methodOutgoingLinksMap[sourceMethodId]) {
            methodOutgoingLinksMap[sourceMethodId] = [];
        }
        methodOutgoingLinksMap[sourceMethodId].push(link);
    });
    
    // Function to assign exit indices based on relative target positions
    const updateExitIndices = () => {
        Object.keys(methodOutgoingLinksMap).forEach(sourceMethodId => {
            const links = methodOutgoingLinksMap[sourceMethodId];
            const sourceMethod = methodNodes.find(m => m.id === sourceMethodId);
            if (!sourceMethod) return;
            
            const sourceClass = classNodes.find(c => c.id === sourceMethod.class);
            if (!sourceClass) return;
            
            const sourceMethods = classMethodsMap[sourceClass.id] || [];
            const sourceMethodIndex = sourceMethods.indexOf(sourceMethodId);
            const sourceY = sourceClass.y + 30 + (sourceMethodIndex * 40) + 15;
            
            // Sort links by target position: primarily by Y (vertical), then by X (horizontal)
            links.sort((linkA, linkB) => {
                const targetNodeA = data.nodes.find(n => n.id === linkA.target);
                const targetNodeB = data.nodes.find(n => n.id === linkB.target);
                const targetClassA = classNodes.find(c => c.id === targetNodeA?.class);
                const targetClassB = classNodes.find(c => c.id === targetNodeB?.class);
                
                if (!targetClassA || !targetClassB) return 0;
                
                const targetMethodsA = classMethodsMap[targetClassA.id] || [];
                const targetMethodsB = classMethodsMap[targetClassB.id] || [];
                const targetMethodIndexA = targetMethodsA.indexOf(linkA.target);
                const targetMethodIndexB = targetMethodsB.indexOf(linkB.target);
                
                const targetYA = targetClassA.y + 30 + (targetMethodIndexA * 40) + 15;
                const targetYB = targetClassB.y + 30 + (targetMethodIndexB * 40) + 15;
                
                // Primary sort: by Y position relative to source
                const relativeYA = targetYA - sourceY;
                const relativeYB = targetYB - sourceY;
                
                if (Math.abs(relativeYA - relativeYB) > 10) {
                    // Significant vertical difference - sort by Y
                    return relativeYA - relativeYB;
                } else {
                    // Similar vertical position - sort by X (rightmost first gets middle stagger)
                    const targetXA = targetClassA.x;
                    const targetXB = targetClassB.x;
                    return targetXA - targetXB;
                }
            });
            
            // Assign exit indices based on sorted order
            links.forEach((link, index) => {
                link._exitIndex = index;
                link._totalExits = links.length;
            });
        });
    };
    
    // Initial assignment
    updateExitIndices();
    
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
    
    // Create force for node repulsion (will be adjusted by slider)
    let chargeForce = d3.forceManyBody().strength(-1000);
    
    // Create simulation with only class nodes
    const simulation = d3.forceSimulation(classNodes)
        .force("charge", chargeForce)
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
    
    // Add Ctrl/Cmd+scroll to adjust force (use native event listener for better Mac support)
    svg.node().addEventListener('wheel', function(event) {
        if (event.ctrlKey || event.metaKey) { // Support both Ctrl and Cmd (Mac)
            event.preventDefault();
            event.stopPropagation();
            
            // Determine scroll direction (negative = scroll up, positive = scroll down)
            const delta = event.deltaY;
            const step = 50; // Adjust force by this amount per scroll
            
            if (delta < 0) {
                // Scrolling up - increase repulsion (more negative)
                currentForceStrength = currentForceStrength - step;
            } else {
                // Scrolling down - decrease repulsion (less negative)
                currentForceStrength = currentForceStrength + step;
            }
            
            chargeForce.strength(currentForceStrength);
            simulation.alpha(0.3).restart(); // Restart simulation with new force
        }
    }, { passive: false });
    
    // Helper function to get link start and end points for gradient
    const getLinkGradientCoords = (d) => {
        const sourceNode = data.nodes.find(n => n.id === d.source);
        const targetNode = data.nodes.find(n => n.id === d.target);
        const sourceClass = classNodes.find(c => c.id === sourceNode?.class);
        const targetClass = classNodes.find(c => c.id === targetNode?.class);
        
        if (!sourceClass || !targetClass || !sourceNode || !targetNode) {
            return { x1: 0, y1: 0, x2: 0, y2: 0 };
        }
        
        const sourceMethods = classMethodsMap[sourceClass.id] || [];
        const targetMethods = classMethodsMap[targetClass.id] || [];
        const sourceMethodIndex = sourceMethods.indexOf(d.source);
        const targetMethodIndex = targetMethods.indexOf(d.target);
        
        const sourceMethod = methodNodes.find(m => m.id === d.source);
        const targetMethod = methodNodes.find(m => m.id === d.target);
        
        if (!sourceMethod || !targetMethod) {
            return { x1: 0, y1: 0, x2: 0, y2: 0 };
        }
        
        const sourceMethodWidth = Math.max(sourceMethod.name.length * 7 + 10, 80);
        const targetMethodWidth = Math.max(targetMethod.name.length * 7 + 10, 80);
        
        const sourceX = sourceClass.x;
        const sourceY = sourceClass.y + 30 + (sourceMethodIndex * 40) + 15;
        const targetX = targetClass.x;
        const targetY = targetClass.y + 30 + (targetMethodIndex * 40) + 15;
        
        const isSameClass = sourceClass.id === targetClass.id;
        const horizontalOffset = 5;
        
        const exitIndex = d._exitIndex || 0;
        const totalExits = d._totalExits || 1;
        const staggerAmount = 4;
        const exitYOffset = (exitIndex - (totalExits - 1) / 2) * staggerAmount;
        
        if (isSameClass) {
            // For same-class calls, always exit from right and enter from right
            const startX = sourceX + sourceMethodWidth / 2;
            const startY = sourceY + exitYOffset;
            const endX = targetX + targetMethodWidth / 2;
            const endY = targetY;
            
            return { x1: startX, y1: startY, x2: endX, y2: endY };
        } else {
            const sourceRightX = sourceX + sourceMethodWidth / 2;
            const sourceRightY = sourceY + exitYOffset;
            const targetLeftX = targetX - targetMethodWidth / 2;
            const targetLeftY = targetY;
            
            return { x1: sourceRightX, y1: sourceRightY, x2: targetLeftX, y2: targetLeftY };
        }
    };
    
    // Wrapper to call the extracted link path generator function with required dependencies
    const generateLinkPath = (d) => {
        return window.generateLinkPath(d, data, classNodes, methodNodes, classMethodsMap);
    };
    
    // Draw calls links (method->method) - curved paths with arrows
    const callsLink = container.append("g")
        .attr("class", "calls-links")
        .selectAll("path")
        .data(callsLinks)
        .enter()
        .each(function(d, i) {
            // Create unique gradient for each link based on its path
            const coords = getLinkGradientCoords(d);
            const gradientId = `linkGradient-${i}`;
            
            const gradient = defs.append("linearGradient")
                .attr("id", gradientId)
                .attr("gradientUnits", "userSpaceOnUse")
                .attr("x1", coords.x1)
                .attr("y1", coords.y1)
                .attr("x2", coords.x2)
                .attr("y2", coords.y2);
            
            gradient.append("stop")
                .attr("offset", "0%")
                .attr("stop-color", "#3498db") // Blue at start (source)
                .attr("stop-opacity", 1);
            
            gradient.append("stop")
                .attr("offset", "100%")
                .attr("stop-color", "#e74c3c") // Red at end (target)
                .attr("stop-opacity", 1);
            
            d._gradientId = gradientId;
        })
        .append("path")
        .attr("class", "link")
        .attr("stroke", d => `url(#${d._gradientId})`)
        .attr("stroke-width", calls_link_attrs["stroke-width"])
        .attr("stroke-dasharray", calls_link_attrs["stroke-dasharray"])
        .attr("marker-end", calls_link_attrs["marker-end"])
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
        // Constrain nodes within larger simulation bounds (extends past visible SVG area)
        const margin = 50;
        const simWidth = 2000;  // Larger than SVG width (1400)
        const simHeight = 1500; // Larger than SVG height (1000)
        const centerX = simWidth / 2;
        const centerY = simHeight / 2;
        
        classNodes.forEach(node => {
            node.x = Math.max(margin, Math.min(simWidth - margin, node.x));
            node.y = Math.max(margin, Math.min(simHeight - margin, node.y));
        });
        
        // Update center force to match simulation bounds
        simulation.force("center", d3.forceCenter(centerX, centerY).strength(0.2));
        
        // Update exit indices based on current positions
        updateExitIndices();
        
        callsLink
            .attr("d", d => generateLinkPath(d))
            .each(function(d) {
                // Update gradient coordinates as nodes move
                if (d._gradientId) {
                    const coords = getLinkGradientCoords(d);
                    const gradient = defs.select(`#${d._gradientId}`);
                    if (!gradient.empty()) {
                        gradient
                            .attr("x1", coords.x1)
                            .attr("y1", coords.y1)
                            .attr("x2", coords.x2)
                            .attr("y2", coords.y2);
                    }
                }
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
            const scale = Math.min(fullWidth / width, fullHeight / height) * 0.9; // 90% scale for padding
            const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
            
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        }
    });
    
    // Filter functionality
    let filterRegex = null;
    
    function applyFilter() {
        const filterInput = document.getElementById('class-filter');
        const filterValue = filterInput.value.trim();
        
        // Compile regex or set to null if empty
        try {
            filterRegex = filterValue ? new RegExp(filterValue, 'i') : null;
        } catch (e) {
            // Invalid regex - don't filter
            filterRegex = null;
            filterInput.style.borderColor = '#e74c3c';
            return;
        }
        
        filterInput.style.borderColor = '';
        
        // Helper function to check if a class name matches the filter
        const isFiltered = (className) => {
            if (!filterRegex || !className) return false;
            return filterRegex.test(className);
        };
        
        // Helper to get class name from a method node ID (format: "ClassName::methodName")
        const getClassFromMethodId = (methodId) => {
            if (!methodId) return null;
            const match = methodId.match(/^(.+?)::/);
            return match ? match[1] : null;
        };
        
        // Filter class nodes
        classNode.style("display", d => {
            return isFiltered(d.id) ? "none" : "block";
        });
        
        // Filter method nodes (inside class groups) - hide entire method group if class is filtered
        classNode.selectAll(".methods").style("display", function() {
            const classId = d3.select(this.parentElement).datum()?.id;
            return isFiltered(classId) ? "none" : "block";
        });
        
        // Filter call links - check both source and target classes
        callsLink.style("display", d => {
            // Links have source and target as method IDs (format: "ClassName::methodName")
            const sourceId = typeof d.source === 'string' ? d.source : (d.source?.id || d.source);
            const targetId = typeof d.target === 'string' ? d.target : (d.target?.id || d.target);
            
            const sourceClass = getClassFromMethodId(sourceId);
            const targetClass = getClassFromMethodId(targetId);
            
            // Hide link if either source or target class is filtered
            return (isFiltered(sourceClass) || isFiltered(targetClass)) ? "none" : "block";
        });
    }
    
    // Add event listener to filter input
    const filterInput = document.getElementById('class-filter');
    filterInput.addEventListener('input', applyFilter);
    filterInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilter();
        }
    });
}

// Load graph on page load
loadGraph();
