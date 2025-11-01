from domain.entities.order import Order
from domain.entities.product import Product


class InventoryService:
    """Domain service for managing inventory logic."""
    
    def __init__(self, product_repository):
        self.product_repository = product_repository
    
    def check_availability(self, order):
        """Check if all items in an order are available."""
        for item in order.items:
            if not item.product.is_available(item.quantity):
                return False
        return True
    
    def reserve_items(self, order):
        """Reserve items for an order."""
        for item in order.items:
            item.product.reduce_stock(item.quantity)
            self.product_repository.save(item.product)
    
    def add_stock(self, product, quantity):
        """Add stock to a product."""
        product.increase_stock(quantity)
        self.product_repository.save(product)
    
    def get_low_stock_products(self, threshold=10):
        """Get all products with stock below threshold."""
        all_products = self.product_repository.get_all()
        return [product for product in all_products if product.stock_quantity < threshold]
