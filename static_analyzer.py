"""Static analyzer to find all classes and methods in Python files."""

import ast
from pathlib import Path
from typing import Dict, Set, List, Tuple


def find_classes_and_methods(directory: str) -> Dict[str, Set[str]]:
    """
    Recursively find all classes and their methods in Python files.
    
    Args:
        directory: Root directory to scan for Python files
        
    Returns:
        Dictionary mapping class names to sets of method names
    """
    classes_data = {}
    directory_path = Path(directory)
    
    # Walk through all Python files
    for python_file in directory_path.rglob("*.py"):
        # Skip __pycache__ and __init__.py files
        if '__pycache__' in str(python_file) or python_file.name == '__init__.py':
            continue
        
        try:
            with open(python_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content, filename=str(python_file))
            
            # Visit the AST to find classes and methods
            visitor = ClassMethodVisitor(python_file)
            visitor.visit(tree)
            
            # Merge findings into classes_data
            for class_name, methods in visitor.classes.items():
                if class_name not in classes_data:
                    classes_data[class_name] = set()
                classes_data[class_name].update(methods)
                
        except SyntaxError:
            # Skip files with syntax errors
            continue
        except Exception:
            # Skip files that can't be parsed for any reason
            continue
    
    return classes_data


class ClassMethodVisitor(ast.NodeVisitor):
    """AST visitor to extract class and method definitions."""
    
    def __init__(self, file_path: Path):
        self.file_path = file_path
        self.classes: Dict[str, Set[str]] = {}
        self.current_class = None
    
    def visit_ClassDef(self, node):
        """Visit class definitions."""
        self.current_class = node.name
        
        # Initialize methods set for this class
        if self.current_class not in self.classes:
            self.classes[self.current_class] = set()
        
        # Visit all child nodes (methods, nested classes, etc.)
        for child in ast.iter_child_nodes(node):
            self.visit(child)
        
        self.current_class = None
    
    def visit_FunctionDef(self, node):
        """Visit function/method definitions."""
        # Skip if not inside a class (module-level functions)
        if self.current_class is None:
            self.generic_visit(node)
            return
        
        # Skip private methods starting with __ unless they're dunder methods
        method_name = node.name
        if method_name.startswith('__') and not (method_name.startswith('__') and method_name.endswith('__')):
            # Skip methods like __private but keep __init__, __str__, etc.
            pass
        elif not method_name.startswith('_'):
            # Regular method
            self.classes[self.current_class].add(method_name)
        elif method_name.startswith('_') and not method_name.startswith('__'):
            # Protected method (single underscore) - include it
            self.classes[self.current_class].add(method_name)
        elif method_name.startswith('__') and method_name.endswith('__'):
            # Dunder method - include it
            self.classes[self.current_class].add(method_name)
        
        self.generic_visit(node)

