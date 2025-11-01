"""FastAPI backend for call path visualization."""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from tracer_demo import CallTracer
from data_processor import generate_d3_data

app = FastAPI(title="Call Path Visualizer")

# Mount static files
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/api/trace")
def get_trace_data():
    """Run tracing on DDD project and return graph data."""
    # Import here to avoid issues
    sys.path.insert(0, str(Path(__file__).parent.parent / 'sample_ddd_project'))
    
    from domain.entities.user import User
    from domain.entities.product import Product
    from infrastructure.repositories.user_repository import UserRepository
    from infrastructure.repositories.order_repository import OrderRepository
    from infrastructure.repositories.product_repository import ProductRepository
    from domain.services.order_service import OrderService
    from domain.services.inventory_service import InventoryService
    from application.use_cases.create_order_use_case import CreateOrderUseCase
    
    # Create tracer
    tracer = CallTracer()
    tracer.start_tracing()
    
    # Execute test scenario
    user_repo = UserRepository()
    order_repo = OrderRepository()
    product_repo = ProductRepository()
    inventory_service = InventoryService(product_repo)
    order_service = OrderService(order_repo, product_repo, inventory_service)
    
    use_case = CreateOrderUseCase(order_service, inventory_service)
    
    user = User(1, "alice@example.com", "Alice")
    product = Product(1, "Widget", 10.0, 5)
    product_repo.save(product)
    
    order_items = [{'product': product, 'quantity': 2}]
    result = use_case.execute(user, order_items)
    
    # Stop tracing
    events = tracer.stop_tracing()
    
    # Generate D3 data
    graph_data = generate_d3_data(events)
    
    return graph_data


@app.get("/", response_class=HTMLResponse)
def index():
    """Serve the main visualization page."""
    html_file = Path(__file__).parent / "static" / "index.html"
    return HTMLResponse(content=html_file.read_text())

