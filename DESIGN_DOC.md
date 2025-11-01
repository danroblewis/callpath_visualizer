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

- **Runtime Tracing**: Record function calls during test execution using Python's tracing capabilities
- **JSON Export**: Output structured architectural data in JSON format with location information
- **Location Tracking**: Include file paths and line numbers for UI integration
- **E2E Test Integration**: Works with existing end-to-end tests to capture real execution paths

## Technical Approach

### Why Runtime Tracing Over AST or Regex

**Regex Limitations:**
- Cannot handle multi-line method calls
- Misses dynamic imports and string-based calls
- Fails on decorators, properties, and metaprogramming
- Cannot distinguish between method calls and attribute access

**AST Static Analysis Limitations:**
- Duck typing makes it impossible to determine runtime types of variables
- Properties: `@property` calls appear as attribute access in AST
- Cannot resolve dynamic dispatch and interface-based calls
- Heavily relies on heuristics that fail in common Python patterns
- Misses the actual execution flow of real code

**Runtime Tracing (Chosen):**
- **Captures Reality**: Records what actually happens during execution
- **Handles All Python Features**: Properties, metaclasses, dynamic dispatch all "just work"
- **Test-Driven**: Leverages existing e2e tests as execution harness
- **Definitive**: No ambiguity about which methods are actually called
- Provides precise location information from call frames

### Pragmatic Assumptions

We assume that:
1. The codebase has at least one end-to-end test that exercises the target functionality
2. Tests can be run in isolation without external dependencies (unit test style)
3. If you can't run it, you can't use it anyway
4. Missing coverage gaps will be identified by users running the tool

**Benefits of This Approach:**
- Reflects real usage
- Generates accurate call paths
- Reveals gaps in test coverage
- Simpler than AST analysis
- Works with existing tests

## Implementation Strategy

### Python Tracing API

Python provides `sys.settrace()` and `trace` module for runtime instrumentation:
- `call` events: function/method entry
- `line` events: line execution
- `return` events: function/method exit
- `exception` events: exception handling

We can build a custom tracer that captures:
- Which methods are called
- Which classes/methods call which
- File paths and line numbers from call frames
- Call sequences and nesting depth

### Phase 1: Build Call Tracer
1. Create tracer class implementing `sys.settrace()` callback
2. Track entry/exit for all function calls
3. Build call stack to identify caller/callee relationships
4. Filter to only inter-class method calls
5. Capture file paths and line numbers from frame objects

### Phase 2: Integrate with Test Runner
1. Provide decorator or context manager to wrap e2e tests
2. Run tests with tracing enabled
3. Collect call data during execution
4. Clean up trace handlers after completion

### Phase 3: Enhance with Structural Data
1. Parse source files with AST to get class/metadata
2. Enrich call traces with class inheritance info
3. Detect composition relationships from `__init__` methods
4. Match call data to class structure

### Phase 4: JSON Serialization
1. Convert trace data to structured format
2. Include location information from call frames
3. Add class metadata and relationships
4. Output to JSON file

### Key Data Captured at Runtime

From each `sys.settrace()` event:
- `frame.f_code.co_filename`: Source file path
- `frame.f_lineno`: Line number
- `frame.f_code.co_name`: Function/method name
- `frame.f_locals`: Local variables (for identifying instances)
- Call stack: Track nested calls to identify caller

## JSON Export Format

The tool outputs architectural data in a structured JSON format with location information for UI navigation.

### Schema Design Rationale

**Location Information:**
- File paths and line numbers enable clickable navigation in UIs
- Line ranges for methods allow jumping to specific code sections
- Location data captured from trace frame objects during execution

**Field-Level Granularity:**
- Track both composition (instance attributes) and dependencies (temporary references)
- Attributes capture "HAS-A" relationships
- Dependencies capture temporary usage patterns

### Example JSON Output

```json
{
  "classes": [
    {
      "name": "Animal",
      "module": "animals",
      "file_path": "animals.py",
      "line_range": [1, 10],
      "base_classes": [],
      "methods": [
        {
          "name": "speak",
          "line_range": [4, 6],
          "is_private": false
        },
        {
          "name": "eat",
          "line_range": [8, 10],
          "is_private": false
        }
      ],
      "attributes": []
    },
    {
      "name": "Dog",
      "module": "animals",
      "file_path": "animals.py",
      "line_range": [13, 23],
      "base_classes": ["Animal"],
      "methods": [
        {
          "name": "speak",
          "line_range": [16, 18],
          "is_private": false
        },
        {
          "name": "fetch",
          "line_range": [20, 23],
          "is_private": false
        }
      ],
      "attributes": []
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
      "owner_file": "person.py",
      "owned_type": "Dog",
      "field_name": "pet",
      "line_number": 9,
      "relationship_type": "attribute"
    }
  ],
  "method_calls": [
    {
      "from_class": "Dog",
      "from_method": "fetch",
      "from_file": "animals.py",
      "from_line": 22,
      "to_class": "Person",
      "to_method": "throw_ball"
    },
    {
      "from_class": "OrderService",
      "from_method": "process_order",
      "from_file": "domain/services/order_service.py",
      "from_line": 25,
      "to_class": "InventoryService",
      "to_method": "check_availability"
    }
  ]
}
```

### Complex Example: DDD Order Service

```json
{
  "classes": [
    {
      "name": "OrderService",
      "module": "domain.services.order_service",
      "file_path": "domain/services/order_service.py",
      "line_range": [5, 38],
      "base_classes": [],
      "methods": [
        {
          "name": "__init__",
          "line_range": [8, 11],
          "is_private": false
        },
        {
          "name": "create_order",
          "line_range": [13, 21],
          "is_private": false
        },
        {
          "name": "process_order",
          "line_range": [23, 33],
          "is_private": false
        },
        {
          "name": "_generate_order_id",
          "line_range": [35, 38],
          "is_private": true
        }
      ],
      "attributes": [
        {
          "name": "order_repository",
          "line_number": 9,
          "type_hint": null
        },
        {
          "name": "product_repository",
          "line_number": 10,
          "type_hint": null
        },
        {
          "name": "inventory_service",
          "line_number": 11,
          "type_hint": null
        }
      ]
    }
  ],
  "inheritance_relationships": [],
  "composition_relationships": [],
  "method_calls": [
    {
      "from_class": "OrderService",
      "from_method": "create_order",
      "from_file": "domain/services/order_service.py",
      "from_line": 18,
      "to_class": "Order",
      "to_method": "add_item"
    },
    {
      "from_class": "OrderService",
      "from_method": "create_order",
      "from_file": "domain/services/order_service.py",
      "from_line": 20,
      "to_class": "OrderRepository",
      "to_method": "save"
    },
    {
      "from_class": "OrderService",
      "from_method": "process_order",
      "from_file": "domain/services/order_service.py",
      "from_line": 25,
      "to_class": "InventoryService",
      "to_method": "check_availability"
    },
    {
      "from_class": "OrderService",
      "from_method": "process_order",
      "from_file": "domain/services/order_service.py",
      "from_line": 27,
      "to_class": "Order",
      "to_method": "complete"
    }
  ]
}
```

## Summary and Key Decisions

### Chosen Trade-offs

1. **Runtime Tracing over Static Analysis**: Record actual execution paths rather than inferring from code
2. **Test-Driven**: Require e2e tests as execution harness - leverages existing test infrastructure
3. **Simpler Over Comprehensive**: Focus on understanding how code is actually used rather than all possible paths
4. **Location Data**: Capture file paths and line numbers from trace frames for UI navigation

### Runtime Tracing Benefits

- **Accuracy**: Records what actually happens - no guessing
- **Complete**: Handles all Python features naturally (properties, metaclasses, duck typing)
- **Test Coverage**: Identifies gaps by showing what isn't tested
- **Pragmatic**: Works with existing code patterns without special cases

### Known Limitations

1. **Requires Executable Code**: Can only analyze code you can actually run
2. **Test Coverage Dependent**: Misses paths not exercised by tests
3. **Performance Impact**: Tracing adds overhead to test execution
4. **No Dead Code**: Won't show unused code paths

### Future Extensions

- Hybrid approach: Combine runtime tracing with AST for structural data
- Multi-test aggregation: Merge call paths from multiple tests
- Coverage visualization: Highlight which paths are/aren't tested
- Async/await support: Trace coroutines and async methods
- Mock detection: Identify and filter mocked dependencies

### Success Criteria

The tool will be successful if it can:
1. Record all inter-class method calls during test execution
2. Provide accurate location data from call frames
3. Generate JSON output that enables interactive code exploration
4. Work seamlessly with existing pytest/unittest infrastructure
5. Handle the DDD sample project with 100% accuracy for executed paths