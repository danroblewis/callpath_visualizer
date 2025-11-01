"""FastAPI backend for call path visualization."""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from trace_runner import run_traced_script
from data_processor import generate_d3_data

app = FastAPI(title="Call Path Visualizer")

# Mount static files
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/api/trace")
def get_trace_data():
    """Run tracing on DDD project and return graph data."""
    project_root = str(Path(__file__).parent.parent / 'sample_ddd_project')
    script_path = str(Path(__file__).parent.parent / 'run_ddd_scenario.py')
    
    # Run script with tracing (tracing starts before script loads and stops after execution)
    from trace_runner import run_traced_script
    events = run_traced_script(script_path, project_root=project_root)
    
    # Generate D3 data
    graph_data = generate_d3_data(events)
    
    return graph_data


@app.get("/", response_class=HTMLResponse)
def index():
    """Serve the main visualization page."""
    html_file = Path(__file__).parent / "static" / "index.html"
    return HTMLResponse(content=html_file.read_text())

