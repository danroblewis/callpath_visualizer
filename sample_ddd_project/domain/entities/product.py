class Product:
    """Domain entity representing a product."""
    
    def __init__(self, product_id, name, price, stock_quantity):
        self.product_id = product_id
        self.name = name
        self.price = price
        self.stock_quantity = stock_quantity
    
    def is_available(self, quantity):
        """Check if product has enough stock."""
        return self.stock_quantity >= quantity
    
    def reduce_stock(self, quantity):
        """Reduce stock by the given quantity."""
        self.stock_quantity -= quantity
    
    def increase_stock(self, quantity):
        """Increase stock by the given quantity."""
        self.stock_quantity += quantity
