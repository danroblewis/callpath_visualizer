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
    # Import sample code
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent / 'sample_project'))
    
    from animals import Dog, Animal
    from person import Person
    
    # Create tracer
    tracer = CallTracer()
    tracer.start_tracing()
    
    # Execute test scenario
    person = Person("Alice")
    person.pet.speak()
    person.pet.fetch(person)
    
    # Stop tracing
    events = tracer.stop_tracing()
    
    # Print results
    print(f"Captured {len(events)} function calls:\n")
    for event in events:
        indent = "  " * (event.get('depth', 0))
        class_part = f"{event['class']}." if event['class'] else ""
        filename = event['filename'].split('/')[-1]
        print(f"{indent}{filename}:{event['line']} in {class_part}{event['function']}")
