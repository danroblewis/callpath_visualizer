# PyCallPathVisualizer

A tool for visualizing Python code architecture by tracing function calls during test execution.

## Overview

PyCallPathVisualizer records all inter-class method calls that occur during end-to-end test execution, providing a precise view of how your code actually runs. Unlike static analysis tools, this captures real execution paths and handles Python's dynamic features naturally.

## Status

✅ Working prototype with interactive D3.js visualization!

Features:
- Runtime tracing using `sys.settrace()`
- Hierarchical graph with classes and methods as separate nodes
- Interactive D3.js visualization with pan/zoom
- FastAPI webapp backend
- Real-time call path rendering

## Quick Start

### Installation

```bash
pip install -r requirements.txt
```

### Run the Webapp

```bash
cd renderer
python3 run_server.py
```

Then open http://localhost:8001 in your browser.

### Project Structure

**Core Components:**
- `renderer/` - FastAPI webapp
  - `api.py` - FastAPI backend with `/api/trace` endpoint
  - `data_processor.py` - Converts tracer events to D3.js graph data
  - `index.html` - Interactive D3.js frontend
  - `run_server.py` - Server startup script
- `tracer_demo.py` - Runtime tracer using `sys.settrace()`

**Documentation & Examples:**
- `DESIGN_DOC.md` - Complete design document
- `sample_project/` - Simple example with inheritance, composition, and method calls
- `sample_ddd_project/` - Complex DDD example with entities, repositories, and services

**Legacy Scripts:**
- `tracer_to_d3.py` - Old single-file script (replaced by webapp)

## Key Design Decisions

- **Runtime Tracing over Static Analysis**: Captures actual execution rather than guessing from code
- **Test-Driven**: Requires e2e tests as execution harness
- **Pragmatic**: Only analyzes code you can actually run
- **Hierarchical Visualization**: Classes and methods rendered as separate nodes
- **Interactive Graph**: D3.js with pan, zoom, and drag

## Architecture

The webapp consists of:
1. **Backend** (`api.py`): Runs tests with tracing, processes events, returns JSON
2. **Data Processor** (`data_processor.py`): Builds class/method nodes and call links
3. **Frontend** (`index.html`): D3.js force-directed graph with interaction

## Example Output

The tool generates an interactive network graph showing:
- **Blue boxes**: Classes
- **Green boxes**: Methods  
- **Solid gray lines**: Class-to-method connections
- **Dashed arrows**: Method-to-method call relationships
