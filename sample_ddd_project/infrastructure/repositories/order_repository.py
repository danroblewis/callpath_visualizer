from domain.entities.order import Order


class OrderRepository:
    """Repository for managing Order entities."""
    
    def __init__(self):
        self._orders = {}
        self._next_id = 1
    
    def save(self, order):
        """Save or update an order."""
        self._orders[order.order_id] = order
    
    def find_by_id(self, order_id):
        """Find an order by ID."""
        return self._orders.get(order_id)
    
    def find_by_user(self, user):
        """Find all orders for a specific user."""
        return [order for order in self._orders.values() if order.user == user]
    
    def get_all(self):
        """Get all orders."""
        return list(self._orders.values())
    
    def delete(self, order_id):
        """Delete an order by ID."""
        if order_id in self._orders:
            del self._orders[order_id]
