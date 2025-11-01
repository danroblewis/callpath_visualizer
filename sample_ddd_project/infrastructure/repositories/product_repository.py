from domain.entities.product import Product


class ProductRepository:
    """Repository for managing Product entities."""
    
    def __init__(self):
        self._products = {}
        self._next_id = 1
    
    def save(self, product):
        """Save or update a product."""
        self._products[product.product_id] = product
    
    def find_by_id(self, product_id):
        """Find a product by ID."""
        return self._products.get(product_id)
    
    def find_by_name(self, name):
        """Find products by name."""
        return [product for product in self._products.values() if name.lower() in product.name.lower()]
    
    def get_available_products(self):
        """Get all products that are in stock."""
        return [product for product in self._products.values() if product.stock_quantity > 0]
    
    def get_all(self):
        """Get all products."""
        return list(self._products.values())
    
    def delete(self, product_id):
        """Delete a product by ID."""
        if product_id in self._products:
            del self._products[product_id]
