# PyCallPathVisualizer

A tool for visualizing Python code architecture by tracing function calls during test execution.

## Overview

PyCallPathVisualizer records all inter-class method calls that occur during end-to-end test execution, providing a precise view of how your code actually runs. Unlike static analysis tools, this captures real execution paths and handles Python's dynamic features naturally.

## Status

Design phase complete. See `DESIGN_DOC.md` for full details.

POC implementation demonstrates:
- Runtime tracing using `sys.settrace()`
- Class and method identification
- Call stack tracking
- See `tracer_demo.py` for proof of concept

## Key Design Decisions

- **Runtime Tracing over Static Analysis**: Captures actual execution rather than guessing from code
- **Test-Driven**: Requires e2e tests as execution harness
- **Pragmatic**: Only analyzes code you can actually run

## Project Structure

- `DESIGN_DOC.md` - Complete design document
- `sample_project/` - Simple example with inheritance, composition, and method calls
- `sample_ddd_project/` - Complex DDD example with entities, repositories, and services
- `tracer_demo.py` - Proof-of-concept runtime tracer

## Next Steps

1. Build production tracer with JSON export
2. Create test decorator/context manager for easy integration
3. Add AST parsing for structural metadata (classes, inheritance)
4. Generate JSON output matching design doc schema
