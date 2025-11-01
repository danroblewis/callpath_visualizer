"""Script to run the DDD sample scenario for tracing."""

from domain.entities.user import User
from domain.entities.product import Product
from infrastructure.repositories.user_repository import UserRepository
from infrastructure.repositories.order_repository import OrderRepository
from infrastructure.repositories.product_repository import ProductRepository
from domain.services.order_service import OrderService
from domain.services.inventory_service import InventoryService
from application.use_cases.create_order_use_case import CreateOrderUseCase

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

