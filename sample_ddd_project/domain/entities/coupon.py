"""Domain entity representing a coupon."""


class Coupon:
    """Domain entity representing a discount coupon."""
    
    def __init__(self, coupon_code, discount_percentage, expiry_date):
        self.coupon_code = coupon_code
        self.discount_percentage = discount_percentage
        self.expiry_date = expiry_date
        self.is_valid = True
    
    def apply_discount(self, amount):
        """Apply the coupon discount to an amount."""
        if not self.is_valid:
            raise ValueError("Coupon is no longer valid")
        return amount * (1 - self.discount_percentage / 100)
    
    def invalidate(self):
        """Mark the coupon as invalid."""
        self.is_valid = False
    
    def is_expired(self, current_date):
        """Check if the coupon has expired."""
        return current_date > self.expiry_date
    
    def validate(self, current_date):
        """Validate the coupon and update validity status."""
        if self.is_expired(current_date):
            self.is_valid = False
            return False
        return True

