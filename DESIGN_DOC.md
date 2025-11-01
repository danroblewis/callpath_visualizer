# PyCallPathVisualizer Design Document

## Project Overview

PyCallPathVisualizer is a tool designed to analyze the architectural structure of Python source code repositories. The goal is to extract structural information from codebases and export it in a structured format for further analysis or tooling.

## Core Analysis Targets

The tool focuses on extracting and representing five key architectural dimensions:

1. **Type/Class Definitions**: All classes defined in the codebase
2. **Inheritance Relationships**: Parent-child relationships between classes (IS-A relationships)
3. **Composition Relationships**: Instance ownership and references between classes (HAS-A relationships)
4. **Methods**: Functions defined within each class
5. **Call Graph Network**: Inter-class method invocations showing communication patterns

## Design Philosophy

### Primary Focus: Implementations
- The tool prioritizes analyzing concrete implementations over abstract interfaces
- While interfaces are recognized, the emphasis is on understanding how classes are actually connected and used

### Use Case: Complex Interconnected Systems
- Optimized for analyzing projects with many inter-dependent classes
- Provides structured data for architectural analysis and tooling
- Useful for refactoring, onboarding, and architectural reviews

## Key Features (Planned)

- **Static Analysis**: Parse Python source code to extract structural information
- **JSON Export**: Output structured architectural data in JSON format

## Technical Approach

The tool will likely use Python's AST (Abstract Syntax Tree) parsing capabilities to analyze source code statically, without requiring code execution.

## JSON Export Format

The tool outputs architectural data in a structured JSON format. Example:

```json
{
  "classes": [
    {
      "name": "Animal",
      "module": "animals",
      "file_path": "animals.py",
      "base_classes": [],
      "methods": [
        {
          "name": "speak"
        },
        {
          "name": "eat"
        }
      ]
    },
    {
      "name": "Dog",
      "module": "animals",
      "file_path": "animals.py",
      "base_classes": ["Animal"],
      "methods": [
        {
          "name": "speak"
        },
        {
          "name": "fetch"
        }
      ]
    }
  ],
  "inheritance_relationships": [
    {
      "child": "Dog",
      "parent": "Animal"
    }
  ],
  "composition_relationships": [
    {
      "owner": "Person",
      "owned_type": "Dog",
      "field_name": "pet"
    }
  ],
  "method_calls": [
    {
      "from_class": "Dog",
      "from_method": "fetch",
      "to_class": "Person",
      "to_method": "throw_ball"
    }
  ]
}
```