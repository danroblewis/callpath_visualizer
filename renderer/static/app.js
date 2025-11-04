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

// Helper functions for path highlighting
function highlightPaths(sourceId, targetId, callsLink, classNode, data, methodNodes, classMethodsMap) {
    // Find all paths leading TO the source (source paths)
    const sourcePaths = new Set();
    const visitedNodes = new Set();

    function findSourcePaths(nodeId) {
        if (visitedNodes.has(nodeId)) return;
        visitedNodes.add(nodeId);

        // Find all links that have this node as target
        callsLink.each(function(d) {
            const linkTargetId = typeof d.target === 'string' ? d.target : (d.target?.id || d.target);
            if (linkTargetId === nodeId) {
                const linkSourceId = typeof d.source === 'string' ? d.source : (d.source?.id || d.source);
                sourcePaths.add(linkSourceId + '::' + linkTargetId);
                findSourcePaths(linkSourceId); // Recursively find paths leading to this source
            }
        });
    }

    // Find all paths leading FROM the target (target paths)
    const targetPaths = new Set();
    const visitedTargetNodes = new Set();

    function findTargetPaths(nodeId) {
        if (visitedTargetNodes.has(nodeId)) return;
        visitedTargetNodes.add(nodeId);

        // Find all links that have this node as source
        callsLink.each(function(d) {
            const linkSourceId = typeof d.source === 'string' ? d.source : (d.source?.id || d.source);
            if (linkSourceId === nodeId) {
                const linkTargetId = typeof d.target === 'string' ? d.target : (d.target?.id || d.target);
                targetPaths.add(linkSourceId + '::' + linkTargetId);
                findTargetPaths(linkTargetId); // Recursively find paths from this target
            }
        });
    }

    findSourcePaths(sourceId);
    findTargetPaths(targetId);

    // Highlight source paths (leading TO)
    callsLink.each(function(d) {
        const linkSourceId = typeof d.source === 'string' ? d.source : (d.source?.id || d.source);
        const linkTargetId = typeof d.target === 'string' ? d.target : (d.target?.id || d.target);
        const linkKey = linkSourceId + '::' + linkTargetId;

        if (sourcePaths.has(linkKey)) {
            d3.select(this).classed("source-path", true);
        }
        if (targetPaths.has(linkKey)) {
            d3.select(this).classed("target-path", true);
        }
    });

    // Highlight source and target nodes
    const allHighlightedNodes = new Set();
    sourcePaths.forEach(pathKey => {
        const [srcId] = pathKey.split('::');
        allHighlightedNodes.add(srcId);
    });
    targetPaths.forEach(pathKey => {
        const [, tgtId] = pathKey.split('::');
        allHighlightedNodes.add(tgtId);
    });
    allHighlightedNodes.add(sourceId);
    allHighlightedNodes.add(targetId);

    // Highlight class and method nodes
    classNode.each(function(d) {
        const classGroup = d3.select(this);
        const methods = classMethodsMap[d.id] || [];
        let hasHighlightedMethod = false;

        methods.forEach(methodId => {
            if (allHighlightedNodes.has(methodId)) {
                hasHighlightedMethod = true;
                classGroup.select(`[data-method-id="${methodId}"]`)
                    .classed("highlighted-method", true);
            }
        });

        if (hasHighlightedMethod || allHighlightedNodes.has(d.id)) {
            classGroup.classed("highlighted-class", true);
        }
    });
}

// New function for highlighting all paths from a starting node (for head nodes)
function highlightAllPathsFromNode(startNodeId, callsLink, classNode, data, methodNodes, classMethodsMap) {
    const allPaths = new Set();
    const allHighlightedNodes = new Set();
    const visitedNodes = new Set();

    function traverseFromNode(nodeId) {
        if (visitedNodes.has(nodeId)) return;
        visitedNodes.add(nodeId);
        allHighlightedNodes.add(nodeId);

        // Find all links that have this node as source
        callsLink.each(function(d) {
            const linkSourceId = typeof d.source === 'string' ? d.source : (d.source?.id || d.source);
            if (linkSourceId === nodeId) {
                const linkTargetId = typeof d.target === 'string' ? d.target : (d.target?.id || d.target);
                const linkKey = linkSourceId + '::' + linkTargetId;
                allPaths.add(linkKey);
                allHighlightedNodes.add(linkTargetId);
                // Recursively traverse from the target
                traverseFromNode(linkTargetId);
            }
        });
    }

    // Start traversal from the given node
    traverseFromNode(startNodeId);

    // Highlight all found paths
    callsLink.each(function(d) {
        const linkSourceId = typeof d.source === 'string' ? d.source : (d.source?.id || d.source);
        const linkTargetId = typeof d.target === 'string' ? d.target : (d.target?.id || d.target);
        const linkKey = linkSourceId + '::' + linkTargetId;

        if (allPaths.has(linkKey)) {
            d3.select(this).classed("target-path", true);
        }
    });

    // Highlight all nodes in the traversal
    classNode.each(function(d) {
        const classGroup = d3.select(this);
        const methods = classMethodsMap[d.id] || [];
        let hasHighlightedMethod = false;

        methods.forEach(methodId => {
            if (allHighlightedNodes.has(methodId)) {
                hasHighlightedMethod = true;
                classGroup.select(`[data-method-id="${methodId}"]`)
                    .classed("highlighted-method", true);
            }
        });

        if (hasHighlightedMethod || allHighlightedNodes.has(d.id)) {
            classGroup.classed("highlighted-class", true);
        }
    });
}

function clearHighlights(callsLink, classNode) {
    // Clear link highlighting
    callsLink.classed("source-path", false)
             .classed("target-path", false)
             .classed("hover", false);
    
    // Clear node highlighting
    classNode.classed("highlighted-class", false);
    classNode.selectAll(".method-box").classed("highlighted-method", false);
}

// Custom force for rectangular collision detection
function rectangularCollision() {
    let nodes;
    let strength = 0.7;
    let iterations = 1;
    
    function force(alpha) {
        const quadtree = d3.quadtree()
            .x(d => d.x)
            .y(d => d.y)
            .addAll(nodes);
        
        for (let iteration = 0; iteration < iterations; ++iteration) {
            for (let i = 0; i < nodes.length; ++i) {
                const node = nodes[i];
                const w = (node._bboxWidth || 100) / 2;
                const h = (node._bboxHeight || 100) / 2;
                
                // Check for collisions with other nodes
                quadtree.visit((quad, x0, y0, x1, y1) => {
                    if (quad.data && quad.data !== node) {
                        const other = quad.data;
                        const ow = (other._bboxWidth || 100) / 2;
                        const oh = (other._bboxHeight || 100) / 2;
                        
                        // Calculate distance between centers
                        const dx = node.x - other.x;
                        const dy = node.y - other.y;
                        
                        // Calculate minimum separation (rectangle collision)
                        const minDx = w + ow;
                        const minDy = h + oh;
                        
                        // Check for collision
                        if (Math.abs(dx) < minDx && Math.abs(dy) < minDy) {
                            // Collision detected - push nodes apart
                            const overlapX = minDx - Math.abs(dx);
                            const overlapY = minDy - Math.abs(dy);
                            
                            // Use the dimension with less overlap for separation
                            let fx = 0;
                            let fy = 0;
                            
                            if (overlapX < overlapY) {
                                // Separate horizontally (less overlap in X)
                                fx = (dx > 0 ? 1 : -1) * overlapX * strength * alpha;
                            } else {
                                // Separate vertically (less overlap in Y)
                                fy = (dy > 0 ? 1 : -1) * overlapY * strength * alpha;
                            }
                            
                            node.vx += fx;
                            node.vy += fy;
                            other.vx -= fx;
                            other.vy -= fy;
                            
                            return true; // Don't descend further
                        }
                        
                        return false; // Continue searching
                    }
                    return false;
                });
            }
        }
    }
    
    force.initialize = function(_) {
        nodes = _;
    };
    
    force.strength = function(_) {
        return arguments.length ? (strength = +_, force) : strength;
    };
    
    force.iterations = function(_) {
        return arguments.length ? (iterations = +_, force) : iterations;
    };
    
    return force;
}

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

// Store original data globally so filters can access it
let originalData = null;
let currentSimulation = null;
let currentContainer = null;
let currentSvg = null;
let currentZoom = null;

function renderGraph(data) {
    // Store original data for filtering
    originalData = JSON.parse(JSON.stringify(data)); // Deep copy
    
    // Clear loading message
    document.getElementById('graph').innerHTML = '';
    
    currentSvg = d3.select("#graph")
        .append("svg")
        .attr("width", 1400)
        .attr("height", 1000);
    
    const tooltip = d3.select("#tooltip");
    
    // Create container group for pan/zoom
    currentContainer = currentSvg.append("g");
    
    // Track current force value for Ctrl+scroll adjustment
    let currentForceStrength = -1000;
    
    // Add zoom behavior with Ctrl/Cmd+scroll override for force adjustment
    currentZoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event) => {
            // Don't zoom if Ctrl/Cmd is held (we'll use that for force adjustment)
            if (event.sourceEvent && (event.sourceEvent.ctrlKey || event.sourceEvent.metaKey)) {
                return;
            }
            currentContainer.attr("transform", event.transform);
        })
        .filter(function(event) {
            // Allow zoom with wheel if Ctrl/Cmd is NOT held
            if (event.type === 'wheel') {
                return !event.ctrlKey && !event.metaKey;
            }
            // Allow other zoom gestures (pinch, etc.)
            return true;
        });
    
    currentSvg.call(currentZoom);
    
    // Initial render with unfiltered data
    rebuildGraphWithFilters(data, currentContainer, currentSvg, currentForceStrength);
    
    // Add Ctrl/Cmd+scroll to adjust force (use native event listener for better Mac support)
    currentSvg.node().addEventListener('wheel', function(event) {
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
            
            if (currentSimulation) {
                currentSimulation.force("charge").strength(currentForceStrength);
                currentSimulation.alpha(0.3).restart(); // Restart simulation with new force
            }
        }
    }, { passive: false });
    
    // Setup filter controls
    setupFilters(currentForceStrength);
}

function rebuildGraphWithFilters(data, container, svg, forceStrength) {
    // Stop existing simulation if any
    if (currentSimulation) {
        currentSimulation.stop();
    }
    
    // Clear existing elements
    container.selectAll(".calls-links").remove();
    container.selectAll(".class-groups").remove();
    container.selectAll("defs").selectAll("linearGradient").remove(); // Remove old gradients
    
    const defs = container.select("defs");
    if (defs.empty()) {
        container.append("defs");
        const newDefs = container.select("defs");
        // Add arrow marker for method calls
        newDefs.append("marker")
            .attrs(arrowhead_marker_attrs)
            .append("path")
            .attrs(arrowhead_path_attrs);
    }
    
    const tooltip = d3.select("#tooltip");
    
    // Separate class and method nodes
    let classNodes = data.nodes.filter(d => d.type === 'class');
    let methodNodes = data.nodes.filter(d => d.type === 'method');
    let containsLinks = data.links.filter(d => d.type === 'contains');
    let callsLinks = data.links.filter(d => d.type === 'calls');
    
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
    // Also calculate bounding box dimensions for collision detection
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
        
        // Calculate bounding box for collision detection
        const classNameWidth = Math.max(node.name.length * 9 + 20, 150);
        const methods = classMethodsMap[node.id] || [];
        
        // Find the maximum method width
        let maxMethodWidth = 80; // Minimum method width
        methods.forEach(methodId => {
            const method = methodNodes.find(m => m.id === methodId);
            if (method) {
                const methodWidth = Math.max(method.name.length * 7 + 10, 80);
                maxMethodWidth = Math.max(maxMethodWidth, methodWidth);
            }
        });
        
        // Bounding box: width is max of class name width and method widths, height includes all methods
        node._bboxWidth = Math.max(classNameWidth, maxMethodWidth);
        node._bboxHeight = 40 + (methods.length * 40); // Class box (40px) + methods (40px each)
        
        // Add padding for collision detection
        const padding = 10;
        node._bboxWidth += padding * 2;
        node._bboxHeight += padding * 2;
    });
    
    // Create force for node repulsion (will be adjusted by slider)
    let chargeForce = d3.forceManyBody().strength(forceStrength);
    
    // Create simulation with only class nodes
    currentSimulation = d3.forceSimulation(classNodes)
        .force("charge", chargeForce)
        .force("center", d3.forceCenter(700, 500).strength(0.2))
        .force("classLink", d3.forceLink(classClassLinks)
            .id(d => d.id)
            .distance(200)
            .strength(0.3))
        .force("collision", rectangularCollision())
        .force("x", d3.forceX(d => {
            // Pull sinks right, sources left
            return 200 + (d._xWeight * 1500);
        }).strength(0.3));
    
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
            // Get source and target method IDs
            const sourceId = typeof d.source === 'string' ? d.source : (d.source?.id || d.source);
            const targetId = typeof d.target === 'string' ? d.target : (d.target?.id || d.target);

            // Highlight this link
            d3.select(this).attr("class", "link hover");

            // For links, highlight all paths from the source (comprehensive traversal)
            highlightAllPathsFromNode(sourceId, callsLink, classNode, data, methodNodes, classMethodsMap);

            // Show tooltip
            const srcMethod = d.source.name || data.nodes.find(n => n.id === sourceId)?.name;
            const tgtMethod = d.target.name || data.nodes.find(n => n.id === targetId)?.name;
            const srcClass = d.source.class || data.nodes.find(n => n.id === sourceId)?.class || '';
            const tgtClass = d.target.class || data.nodes.find(n => n.id === targetId)?.class || '';
            tooltip.style("display", "block")
                .html(`<strong>${srcClass}</strong>.${srcMethod}<br>→<br><strong>${tgtClass}</strong>.${tgtMethod}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function(d) {
            // Clear all highlighting
            clearHighlights(callsLink, classNode);
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
                if (!event.active) currentSimulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on("drag", function(event, d) {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on("end", function(event, d) {
                if (!event.active) currentSimulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));
    
    // Class name box - dynamic width based on text
    classNode.each(function(d) {
        const classNameWidth = Math.max(d.name.length * 9 + 20, 150); // Slightly wider than methods
        const classGroup = d3.select(this);
        
        classGroup.append("rect")
            .attr("class", "class-box")
            .attr("width", classNameWidth)
            .attr("x", -classNameWidth / 2)
            .attr("y", class_box_attrs.y)
            .attr("height", class_box_attrs.height)
            .attr("rx", class_box_attrs.rx)
            .attr("fill", d => d.was_used !== false ? class_box_attrs.fill : "rgba(149, 165, 166, 0.1)") // Gray if unused
            .attr("stroke", d => d.was_used !== false ? class_box_attrs.stroke : "#95a5a6") // Gray border if unused
            .attr("stroke-width", class_box_attrs["stroke-width"])
            .attr("stroke-dasharray", d => d.was_used === false ? "5,5" : null); // Dashed border if unused
        
        classGroup.append("text")
            .attr("class", "class-name")
            .attrs(class_name_attrs)
            .text(d => d.name);
    });
    
    // Method boxes inside each class group
    classNode.each(function(classD) {
        const methods = classMethodsMap[classD.id] || [];
        const methodGroup = d3.select(this).append("g").attr("class", "methods");
        
        methods.forEach((methodId, i) => {
            const method = methodNodes.find(m => m.id === methodId);
            if (method) {
                const methodBox = methodGroup.append("g")
                    .attr("class", "method-box")
                    .attr("data-method-id", method.id)
                    .datum(method)
                    .style("cursor", "pointer")
                    .style("pointer-events", "all");
                
                const methodRect = methodBox.append("rect")
                    .attr("width", d => Math.max(d.name.length * 7 + 10, 80))
                    .attr("x", d => -Math.max(d.name.length * 7 + 10, 80) / 2)
                    .attr("y", 30 + (i * 40))
                    .attr("height", method_box_attrs.height)
                    .attr("rx", method_box_attrs.rx)
                    .attr("fill", d => d.was_called !== false ? method_box_attrs.fill : "rgba(149, 165, 166, 0.15)") // Gray if unused
                    .attr("stroke", d => d.was_called !== false ? method_box_attrs.stroke : "#95a5a6") // Gray border if unused
                    .attr("stroke-width", method_box_attrs["stroke-width"])
                    .attr("stroke-dasharray", d => d.was_called === false ? "3,3" : null) // Dashed border if unused
                    .style("pointer-events", "all");
                
                methodBox.append("text")
                    .attrs(method_text_attrs)
                    .attr("x", 0)
                    .attr("y", 47 + (i * 40))
                    .text(d => d.name)
                    .style("pointer-events", "none"); // Text doesn't capture events
                
                // Add hover handlers to both the group and the rect
                const hoverHandler = function(event, d) {
                    event.stopPropagation(); // Prevent class node hover from firing

                    // Use the new comprehensive traversal function to highlight all paths from this method
                    highlightAllPathsFromNode(d.id, callsLink, classNode, data, methodNodes, classMethodsMap);
                };
                
                const mouseoutHandler = function(event, d) {
                    event.stopPropagation();
                    clearHighlights(callsLink, classNode);
                };
                
                methodBox.on("mouseover", hoverHandler)
                         .on("mouseout", mouseoutHandler);
                methodRect.on("mouseover", hoverHandler)
                          .on("mouseout", mouseoutHandler);
            }
        });
    });
    
    // Add hover handlers to class nodes
    classNode.on("mouseover", function(event, d) {
        // Find all methods in this class
        const methods = classMethodsMap[d.id] || [];

        // For each method, highlight all paths from that method using comprehensive traversal
        methods.forEach(methodId => {
            highlightAllPathsFromNode(methodId, callsLink, classNode, data, methodNodes, classMethodsMap);
        });
    })
    .on("mouseout", function(d) {
        clearHighlights(callsLink, classNode);
    });
    
    // Update positions on simulation tick
    currentSimulation.on("tick", () => {
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
        currentSimulation.force("center", d3.forceCenter(centerX, centerY).strength(0.2));
        
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
    currentSimulation.on("end", () => {
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
                .call(currentZoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        }
    });
}

function setupFilters(initialForceStrength) {
    // Filter functionality
    let filterRegex = null;
    let showUnused = false; // Default to hiding unused classes/methods
    let currentForceStrength = initialForceStrength;
    
    function applyFilters() {
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
        
        // Get show unused toggle state
        const showUnusedToggle = document.getElementById('show-unused-toggle');
        showUnused = showUnusedToggle.checked;
        
        if (!originalData) return;
        
        // Create filtered copy of data
        const filteredData = JSON.parse(JSON.stringify(originalData));
        
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
        const filteredClassNodes = filteredData.nodes
            .filter(d => d.type === 'class')
            .filter(d => {
                if (isFiltered(d.id)) return false;
                if (!showUnused && d.was_used === false) return false;
                return true;
            });
        
        const filteredClassIds = new Set(filteredClassNodes.map(d => d.id));
        
        // Filter method nodes (only keep methods from visible classes)
        let filteredMethodNodes = filteredData.nodes
            .filter(d => d.type === 'method')
            .filter(d => {
                const className = getClassFromMethodId(d.id);
                if (!className || !filteredClassIds.has(className)) return false;
                
                // If class is visible, check if we should show unused methods
                if (!showUnused && d.was_called === false) return false;
                return true;
            });
        
        // Filter contains links (only keep links for visible classes/methods)
        const filteredContainsLinks = filteredData.links
            .filter(d => d.type === 'contains')
            .filter(d => filteredClassIds.has(d.source) && filteredMethodNodes.some(m => m.id === d.target));
        
        // Filter calls links (only keep links between visible methods)
        const filteredMethodIds = new Set(filteredMethodNodes.map(d => d.id));
        const filteredCallsLinks = filteredData.links
            .filter(d => d.type === 'calls')
            .filter(d => {
                const sourceId = typeof d.source === 'string' ? d.source : (d.source?.id || d.source);
                const targetId = typeof d.target === 'string' ? d.target : (d.target?.id || d.target);
                return filteredMethodIds.has(sourceId) && filteredMethodIds.has(targetId);
            });
        
        // Rebuild filtered data structure
        const rebuildData = {
            nodes: [...filteredClassNodes, ...filteredMethodNodes],
            links: [...filteredContainsLinks, ...filteredCallsLinks]
        };
        
        // Rebuild graph with filtered data
        rebuildGraphWithFilters(rebuildData, currentContainer, currentSvg, currentForceStrength);
    }
    
    // Add event listener to filter input
    const filterInput = document.getElementById('class-filter');
    filterInput.addEventListener('input', applyFilters);
    filterInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
    
    // Add event listener to show unused toggle
    const showUnusedToggle = document.getElementById('show-unused-toggle');
    showUnusedToggle.addEventListener('change', applyFilters);
    
    // Apply initial filter state on page load
    applyFilters();
}

// Load graph on page load
loadGraph();
