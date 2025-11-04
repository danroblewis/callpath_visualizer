"""FastAPI backend for call path visualization."""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json
import subprocess
import sys

app = FastAPI(title="Call Path Visualizer")

# Mount static files
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/api/trace")
def get_trace_data():
    """Generate and return trace data."""
    trace_data_file = Path(__file__).parent.parent / "renderer" / "static" / "trace_data.json"

    if trace_data_file.exists():
        with open(trace_data_file, 'r') as f:
            graph_data = json.load(f)
        return graph_data
    
    # Run generate_trace_data.py to create/update the trace data
    try:
        script_path = Path(__file__).parent.parent / "generate_trace_data.py"
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=False,
            text=True,
            cwd=str(Path(__file__).parent.parent)
        )
        
        if result.returncode != 0:
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Failed to generate trace data",
                    "message": result.stderr or result.stdout
                }
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to run trace generation",
                "message": str(e)
            }
        )
    
    # Load and return the generated trace data
    try:
        with open(trace_data_file, 'r') as f:
            graph_data = json.load(f)
        return graph_data
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Failed to load trace data",
                "message": str(e)
            }
        )


@app.get("/", response_class=HTMLResponse)
def index():
    """Serve the main visualization page."""
    html_file = Path(__file__).parent / "static" / "index.html"
    return HTMLResponse(content=html_file.read_text())

