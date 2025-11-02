"""Email service for sending notifications."""


class EmailService:
    """Service for sending emails."""
    
    def __init__(self):
        self.sent_emails = []
    
    def send_order_confirmation(self, user_email, order_id, order_total):
        """Send order confirmation email to user."""
        subject = f"Order Confirmation - {order_id}"
        body = f"Thank you for your order! Order ID: {order_id}, Total: ${order_total:.2f}"
        
        # In a real implementation, this would actually send an email
        # For this demo, we'll just track it
        email_data = {
            'to': user_email,
            'subject': subject,
            'body': body
        }
        self.sent_emails.append(email_data)
        print(f"[Email] Sending to {user_email}: {subject}")
        return True
    
    def send_order_notification(self, admin_email, order_id):
        """Send notification to admin about new order."""
        subject = f"New Order Received - {order_id}"
        body = f"A new order has been created: {order_id}"
        
        email_data = {
            'to': admin_email,
            'subject': subject,
            'body': body
        }
        self.sent_emails.append(email_data)
        print(f"[Email] Sending to {admin_email}: {subject}")
        return True
    
    def get_sent_emails(self):
        """Get list of sent emails (for testing/demo purposes)."""
        return self.sent_emails

