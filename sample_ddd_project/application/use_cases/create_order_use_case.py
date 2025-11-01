from domain.entities.order import Order
from domain.services.order_service import OrderService
from domain.services.inventory_service import InventoryService


class CreateOrderUseCase:
    """Application use case for creating orders."""
    
    def __init__(self, order_service, inventory_service):
        self.order_service = order_service
        self.inventory_service = inventory_service
    
    def execute(self, user, order_items):
        """Execute the order creation use case."""
        # Check inventory first
        order = self.order_service.create_order(user, order_items)
        
        if self.inventory_service.check_availability(order):
            return self.order_service.process_order(order)
        else:
            return False
