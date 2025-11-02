from domain.entities.order import Order
from domain.entities.user import User


class OrderService:
    """Domain service for handling order-related business logic."""
    
    def __init__(self, order_repository, product_repository, inventory_service, email_service=None):
        self.order_repository = order_repository
        self.product_repository = product_repository
        self.inventory_service = inventory_service
        self.email_service = email_service
    
    def create_order(self, user, order_items):
        """Create a new order for a user."""
        order = Order(self._generate_order_id(), user)
        
        for item in order_items:
            order.add_item(item['product'], item['quantity'])
        
        self.order_repository.save(order)
        
        # Send order confirmation email if email service is available
        if self.email_service:
            order_total = sum(item['product'].price * item['quantity'] for item in order_items)
            self.email_service.send_order_confirmation(user.email, order.order_id, order_total)
            # Also notify admin
            self.email_service.send_order_notification("admin@example.com", order.order_id)
        
        return order
    
    def process_order(self, order):
        """Process an order, checking inventory and completing it."""
        if self.inventory_service.check_availability(order):
            self.inventory_service.reserve_items(order)
            order.complete()
            self.order_repository.save(order)
            return True
        else:
            order.cancel()
            self.order_repository.save(order)
            return False
    
    def _generate_order_id(self):
        """Generate a unique order ID."""
        # Simplified for demo
        return f"ORD-{len(self.order_repository.get_all()) + 1}"
