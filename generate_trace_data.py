"""Script to run the DDD sample scenario for tracing."""

# Add sample_ddd_project to Python path so internal imports work
import sys
from pathlib import Path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir / 'sample_ddd_project'))
sys.path.insert(0, str(current_dir))

# Import all DDD dependencies first (before tracing starts)
from domain.entities.user import User
from domain.entities.product import Product
from infrastructure.repositories.user_repository import UserRepository
from infrastructure.repositories.order_repository import OrderRepository
from infrastructure.repositories.product_repository import ProductRepository
from domain.services.order_service import OrderService
from domain.services.inventory_service import InventoryService
from infrastructure.services.email_service import EmailService
from application.use_cases.create_order_use_case import CreateOrderUseCase

# Import tracer after all other imports
from trace_runner import CallTracer

# Initialize tracer (but don't start tracing yet)
# Set project root to sample_ddd_project directory where the DDD code is located
project_root = str(current_dir / 'sample_ddd_project')
tracer = CallTracer(entry_script=__file__, project_root=project_root)

# Start tracing AFTER imports are complete
tracer.begin()

try:
    # Execute DDD test scenario
    user_repo = UserRepository()
    order_repo = OrderRepository()
    product_repo = ProductRepository()
    inventory_service = InventoryService(product_repo)
    email_service = EmailService()
    order_service = OrderService(order_repo, product_repo, inventory_service, email_service)

    use_case = CreateOrderUseCase(order_service, inventory_service)

    user = User(1, "alice@example.com", "Alice")
    product = Product(1, "Widget", 10.0, 5)
    product_repo.save(product)

    order_items = [{'product': product, 'quantity': 2}]
    result = use_case.execute(user, order_items)

finally:
    # Stop tracing and generate trace data file
    tracer.end()