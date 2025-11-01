class User:
    """Domain entity representing a user."""
    
    def __init__(self, user_id, email, name):
        self.user_id = user_id
        self.email = email
        self.name = name
        self.orders = []
    
    def add_order(self, order):
        """Add an order to the user's list."""
        self.orders.append(order)
    
    def get_total_spent(self):
        """Calculate total amount spent across all orders."""
        return sum(order.total_amount for order in self.orders)


class Address:
    """Value object representing a user's address."""
    
    def __init__(self, street, city, country):
        self.street = street
        self.city = city
        self.country = country
    
    def is_international(self):
        """Check if address is outside the US."""
        return self.country != "US"
