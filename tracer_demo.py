"""
Simple demonstration of Python tracing API to capture function calls.
This is a proof-of-concept for the call path visualizer.
"""

import sys
from typing import List, Tuple


class CallTracer:
    """Tracer that records all function calls during execution."""
    
    def __init__(self):
        self.call_stack = []
        self.call_events = []
        self.depth = 0
    
    def trace_calls(self, frame, event, arg):
        """Callback for sys.settrace - called on each function call."""
        if event == 'call':
            # Record this call
            filename = frame.f_code.co_filename
            function_name = frame.f_code.co_name
            line_number = frame.f_lineno
            
            # Skip internal/third-party code
            if filename.startswith('/System') or '<' in filename or 'tracer_demo' in filename:
                return self.trace_calls
            
            # Try to determine the class name
            class_name = None
            if 'self' in frame.f_locals:
                self_obj = frame.f_locals['self']
                class_name = self_obj.__class__.__name__
            
            call_info = {
                'filename': filename,
                'function': function_name,
                'line': line_number,
                'class': class_name,
                'caller': None
            }
            
            # Set caller if we have a call stack
            if self.call_stack:
                call_info['caller'] = self.call_stack[-1]
            
            self.call_events.append(call_info)
            self.call_stack.append(call_info)
            self.depth += 1
        
        elif event == 'return':
            # Pop from call stack
            if self.call_stack:
                self.call_stack.pop()
                self.depth -= 1
        
        return self.trace_calls
    
    def start_tracing(self):
        """Enable tracing."""
        sys.settrace(self.trace_calls)
    
    def stop_tracing(self):
        """Disable tracing and return events."""
        sys.settrace(None)
        return self.call_events


# Test with sample code
if __name__ == '__main__':
    import sys
    from pathlib import Path
    
    # Choose which project to demo
    project = 'ddd'  # Options: 'ddd' or 'simple'
    
    if project == 'ddd':
        # Import DDD sample code
        sys.path.insert(0, str(Path(__file__).parent / 'sample_ddd_project'))
        
        from domain.entities.user import User
        from domain.entities.product import Product
        from infrastructure.repositories.user_repository import UserRepository
        from infrastructure.repositories.order_repository import OrderRepository
        from infrastructure.repositories.product_repository import ProductRepository
        from domain.services.order_service import OrderService
        from domain.services.inventory_service import InventoryService
        from application.use_cases.create_order_use_case import CreateOrderUseCase
        
        # Create tracer
        tracer = CallTracer()
        tracer.start_tracing()
        
        # Execute DDD test scenario
        # Setup repositories and services
        user_repo = UserRepository()
        order_repo = OrderRepository()
        product_repo = ProductRepository()
        inventory_service = InventoryService(product_repo)
        order_service = OrderService(order_repo, product_repo, inventory_service)
        
        # Create use case
        use_case = CreateOrderUseCase(order_service, inventory_service)
        
        # Create test data
        user = User(1, "alice@example.com", "Alice")
        product = Product(1, "Widget", 10.0, 5)
        product_repo.save(product)
        
        # Execute the use case
        order_items = [{'product': product, 'quantity': 2}]
        result = use_case.execute(user, order_items)
        
        print(f"\nUse case result: {result}")
    
    else:
        # Import simple sample code
        sys.path.insert(0, str(Path(__file__).parent / 'sample_project'))
        
        from animals import Dog, Animal
        from person import Person
        
        # Create tracer
        tracer = CallTracer()
        tracer.start_tracing()
        
        # Execute simple test scenario
        person = Person("Alice")
        person.pet.speak()
        person.pet.fetch(person)
    
    # Stop tracing
    events = tracer.stop_tracing()
    
    # Print results
    print(f"\nCaptured {len(events)} function calls:\n")
    
    # Build a simple call chain visualization
    call_chain = []
    for i, event in enumerate(events, 1):
        class_part = f"{event['class']}." if event['class'] else ""
        filename = event['filename'].split('/')[-1]
        short_filename = filename.replace('.py', '')
        call_display = f"{short_filename}::{class_part}{event['function']}"
        call_chain.append(call_display)
    
    # Print with indentation showing call depth
    call_stack = []
    for i, call in enumerate(call_chain, 1):
        # Estimate depth based on repository/service/entity patterns
        if 'repository' in call.lower() or 'service' in call.lower():
            depth = 0 if not call_stack else 1
        elif '__init__' in call:
            depth = call_stack.count('__init__') if call_stack else 0
        else:
            depth = len(call_stack) if call_stack else 0
        
        indent = "  " * depth
        print(f"{i:2}. {indent}{call}")
        
        # Track stack (simplified)
        if '__init__' in call:
            call_stack.append('__init__')
        elif call_stack and '__init__' in call_stack[-1]:
            call_stack.pop()
