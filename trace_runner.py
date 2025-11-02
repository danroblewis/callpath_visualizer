"""Module for running Python code with tracing enabled."""

import sys
import importlib.util
from pathlib import Path
from typing import List, Dict, Any, Optional


class CallTracer:
    """Tracer that records all function calls during execution."""
    
    def __init__(self, entry_script: Optional[str] = None, project_root: Optional[str] = None):
        self.call_stack = []
        self.call_events = []
        self.depth = 0
        self.entry_script = entry_script  # Track the main script being executed
        self.project_root = project_root  # Track project root directory for filtering
    
    def _should_skip_file(self, filename: str) -> bool:
        """Check if a file should be skipped (standard library, internal, etc.)."""
        import sys
        
        # Skip generated code, frozen modules
        if '<' in filename or filename.startswith('<frozen'):
            return True
        
        # Skip trace_runner module
        if 'trace_runner' in filename:
            return True
        
        # If project_root is set, only include files within the project directory
        if self.project_root:
            from pathlib import Path
            try:
                file_path = Path(filename).resolve()
                project_path = Path(self.project_root).resolve()
                # Check if file is within project directory
                if not str(file_path).startswith(str(project_path)):
                    return True
            except (ValueError, OSError):
                # If path resolution fails, skip it
                pass
        
        # Skip system directories (macOS)
        if filename.startswith('/System') or filename.startswith('/usr'):
            return True
        
        # Skip Python standard library
        stdlib_paths = [
            sys.prefix,
            sys.exec_prefix,
            getattr(sys, 'base_prefix', ''),
            getattr(sys, 'base_exec_prefix', ''),
        ]
        
        for stdlib_path in stdlib_paths:
            if stdlib_path and filename.startswith(stdlib_path):
                # Allow site-packages to be traced (third-party), but not stdlib itself
                if 'site-packages' not in filename:
                    return True
        
        # Skip distutils and setuptools internal modules
        if 'distutils' in filename or 'setuptools' in filename:
            return True
        
        # Skip importlib internal modules
        if filename.endswith('importlib/_bootstrap') or filename.endswith('importlib/_bootstrap_external'):
            return True
        
        return False
    
    def _should_skip_class(self, class_name: str, filename: str) -> bool:
        """Check if a class should be skipped."""
        # Skip internal/stdlib classes
        internal_classes = {
            'PosixPath', 'WindowsPath', 'PurePath', 'Path',
            'DistutilsMetaFinder', '_DistutilsMetaFinder',
            'ModuleSpec', 'Loader', 'Finder',
            '_bootstrap', '_bootstrap_external',
            'object', 'type', 'tuple', 'dict', 'list', 'set',
            'builtin_function_or_method',
        }
        
        if class_name in internal_classes:
            return True
        
        # Skip classes that start with underscore (usually internal)
        if class_name and class_name.startswith('_') and not class_name.startswith('__'):
            # Allow __init__ and other dunder methods
            if class_name.startswith('__') and class_name.endswith('__'):
                return False
            return True
        
        return False
    
    def trace_calls(self, frame, event, arg):
        """Callback for sys.settrace - called on each function call."""
        if event == 'call':
            # Record this call
            filename = frame.f_code.co_filename
            function_name = frame.f_code.co_name
            line_number = frame.f_lineno
            
            # Skip internal/standard library files
            if self._should_skip_file(filename):
                return self.trace_calls
            
            # Try to determine the class name
            class_name = None
            if 'self' in frame.f_locals:
                self_obj = frame.f_locals['self']
                class_name = self_obj.__class__.__name__
                
                # Skip internal/stdlib classes
                if self._should_skip_class(class_name, filename):
                    return self.trace_calls
            
            call_info = {
                'filename': filename,
                'function': function_name,
                'line': line_number,
                'class': class_name,
                'caller': None,
                'depth': self.depth,  # Track actual call depth
                'entry_script': self.entry_script  # Track which script initiated execution
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


def run_traced_script(script_path: str, project_root: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Run a Python script with tracing enabled.
    
    Tracing starts before any imports or execution, and stops after completion.
    
    Args:
        script_path: Path to the Python script to execute
        project_root: Optional root directory to add to sys.path before execution
        
    Returns:
        List of trace events captured during execution
    """
    script_path = Path(script_path)
    
    if not script_path.exists():
        raise FileNotFoundError(f"Script not found: {script_path}")
    
    if project_root:
        sys.path.insert(0, str(Path(project_root).absolute()))
    
    # Create and start tracer BEFORE any imports
    tracer = CallTracer(entry_script=str(script_path), project_root=project_root)
    tracer.start_tracing()
    
    try:
        # Load and execute the script
        spec = importlib.util.spec_from_file_location(
            script_path.stem, 
            script_path
        )
        
        if spec is None or spec.loader is None:
            raise ValueError(f"Could not load script: {script_path}")
        
        module = importlib.util.module_from_spec(spec)
        
        # Execute the module
        sys.modules[script_path.stem] = module
        spec.loader.exec_module(module)
        
    finally:
        # Always stop tracing, even if execution fails
        events = tracer.stop_tracing()
    
    return events


def run_traced_module(module_path: str, function_name: Optional[str] = None, 
                     project_root: Optional[str] = None,
                     **kwargs) -> List[Dict[str, Any]]:
    """
    Run a Python module/function with tracing enabled.
    
    Args:
        module_path: Dot-separated module path (e.g., 'application.use_cases.create_order_use_case')
        function_name: Optional function to call after importing. If None, just imports the module.
        project_root: Optional root directory to add to sys.path
        **kwargs: Arguments to pass to the function if function_name is provided
        
    Returns:
        List of trace events captured during execution
    """
    if project_root:
        sys.path.insert(0, str(Path(project_root).absolute()))
    
    # Create and start tracer BEFORE any imports
    tracer = CallTracer(entry_script=None)  # Module import doesn't have a specific entry script
    tracer.start_tracing()
    
    try:
        # Import the module (this will be traced)
        module = importlib.import_module(module_path)
        
        # Optionally call a function
        if function_name:
            if not hasattr(module, function_name):
                raise AttributeError(f"Module {module_path} has no attribute {function_name}")
            func = getattr(module, function_name)
            func(**kwargs)
    finally:
        # Always stop tracing
        events = tracer.stop_tracing()
    
    return events


def run_traced_code(code_string: str, project_root: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Execute Python code string with tracing enabled.
    
    Args:
        code_string: Python code to execute
        project_root: Optional root directory to add to sys.path
        
    Returns:
        List of trace events captured during execution
    """
    if project_root:
        sys.path.insert(0, str(Path(project_root).absolute()))
    
    # Create and start tracer BEFORE execution
    tracer = CallTracer(entry_script=None, project_root=project_root)  # Code string execution doesn't have a specific entry script
    tracer.start_tracing()
    
    try:
        # Execute the code
        exec(code_string, {'__name__': '__main__'})
    finally:
        # Always stop tracing
        events = tracer.stop_tracing()
    
    return events

