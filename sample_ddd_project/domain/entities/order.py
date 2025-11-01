from .product import Product


class Order:
    """Domain entity representing an order."""
    
    def __init__(self, order_id, user):
        self.order_id = order_id
        self.user = user
        self.items = []
        self.total_amount = 0
        self.status = "pending"
    
    def add_item(self, product, quantity):
        """Add an item to the order."""
        item = OrderItem(product, quantity)
        self.items.append(item)
        self._recalculate_total()
    
    def _recalculate_total(self):
        """Recalculate the total amount of the order."""
        self.total_amount = sum(item.subtotal for item in self.items)
    
    def complete(self):
        """Mark the order as completed."""
        self.status = "completed"
    
    def cancel(self):
        """Cancel the order."""
        self.status = "cancelled"


class OrderItem:
    """Value object representing an order item."""
    
    def __init__(self, product, quantity):
        self.product = product
        self.quantity = quantity
        self.subtotal = product.price * quantity
