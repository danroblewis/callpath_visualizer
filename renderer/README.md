# Renderer Webapp

FastAPI webapp for visualizing Python call paths.

## Setup

Install dependencies:
```bash
pip3 install fastapi uvicorn
```

## Running the Server

Start the server:
```bash
cd renderer
python3 run_server.py
```

This will start the server at http://localhost:8001

## Usage

1. Open http://localhost:8001 in your browser
2. The page will automatically:
   - Run the DDD sample project with tracing
   - Generate graph data from the execution
   - Display the interactive D3.js visualization

## Architecture

- `api.py` - FastAPI backend endpoints
- `data_processor.py` - Converts tracer events to graph data  
- `index.html` - D3.js frontend visualization
- `run_server.py` - Server startup script

## API Endpoints

- `GET /` - Serve the HTML visualization page
- `GET /api/trace` - Run tracing and return graph data as JSON

## Stopping the Server

Press `Ctrl+C` in the terminal running the server, or:
```bash
pkill -f "renderer.api"
```

