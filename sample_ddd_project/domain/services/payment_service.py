from domain.entities.order import Order
from domain.entities.user import User


class PaymentService:
    """Domain service for handling payment logic."""
    
    def __init__(self, user_repository, order_service):
        self.user_repository = user_repository
        self.order_service = order_service
    
    def process_payment(self, order, user):
        """Process payment for an order."""
        if self._validate_payment(order, user):
            # In a real system, this would call payment gateway
            order.complete()
            self.order_service.order_repository.save(order)
            return True
        return False
    
    def _validate_payment(self, order, user):
        """Validate that payment can be processed."""
        # Simplified validation
        return order.total_amount > 0 and user is not None
    
    def issue_refund(self, order):
        """Issue a refund for a cancelled order."""
        if order.status == "cancelled":
            # In a real system, this would call payment gateway
            return True
        return False
