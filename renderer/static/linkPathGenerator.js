// Helper function to generate link paths for the call graph visualization

function generateLinkPath(d, data, classNodes, methodNodes, classMethodsMap) {
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
    const horizontalOffset = 5; // Small horizontal extension (just a few pixels)
    
    // Stagger exit points vertically when multiple links from same method
    const exitIndex = d._exitIndex || 0;
    const totalExits = d._totalExits || 1;
    const staggerAmount = 4; // Pixels to stagger each link
    const exitYOffset = (exitIndex - (totalExits - 1) / 2) * staggerAmount;
    
    if (isSameClass) {
        // For same-class calls, always exit from right and enter from right
        const startX = sourceX + sourceMethodWidth / 2;
        const startY = sourceY + exitYOffset;
        const endX = targetX + targetMethodWidth / 2;
        const endY = targetY;
        const loopSize = 40;
        
        return `
            M ${startX},${startY} 
            C ${startX+loopSize},${startY} ${endX+loopSize},${endY} ${endX},${endY}
            `;
    } else {
        // Different classes: horizontal exit, simple curve, horizontal entry
        const sourceRightX = sourceX + sourceMethodWidth / 2;
        const sourceRightY = sourceY + exitYOffset;
        const targetLeftX = targetX - targetMethodWidth / 2;
        const targetLeftY = targetY;
        
        // Exit point (horizontal offset from source)
        const exitX = sourceRightX + horizontalOffset;
        const exitY = sourceRightY;
        
        // Entry point (horizontal offset from target)
        const entryX = targetLeftX - horizontalOffset;
        const entryY = targetLeftY;
        
        // Smooth curve with small horizontal extensions
        const dx = entryX - exitX;
        const dy = entryY - exitY;
        
        // Exit curve: small horizontal extension from source to exit point
        const exitCtrl1X = sourceRightX + (exitX - sourceRightX) * 0.6;
        const exitCtrl1Y = sourceRightY;
        const exitCtrl2X = exitX - 5;
        const exitCtrl2Y = exitY;
        
        // Main curve: from exit to entry
        const mainCtrl1X = exitX + dx * 0.2;
        const mainCtrl1Y = exitY;
        const mainCtrl2X = entryX - dx * 0.2;
        const mainCtrl2Y = entryY;
        
        // Entry curve: small horizontal extension from entry point to target
        const entryCtrl1X = entryX + 5;
        const entryCtrl1Y = entryY;
        const entryCtrl2X = entryX + (targetLeftX - entryX) * 0.6;
        const entryCtrl2Y = entryY;
        
        return `
            M ${sourceRightX},${sourceRightY} 
            C ${exitCtrl1X},${exitCtrl1Y} ${exitCtrl2X},${exitCtrl2Y} ${exitX},${exitY} 
            C ${mainCtrl1X},${mainCtrl1Y} ${mainCtrl2X},${mainCtrl2Y} ${entryX},${entryY} 
            C ${entryCtrl1X},${entryCtrl1Y} ${entryCtrl2X},${entryCtrl2Y} ${targetLeftX},${targetLeftY}
            `;
    }
}

