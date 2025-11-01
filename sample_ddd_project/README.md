# DDD Sample Project

A sample Domain-Driven Design project to demonstrate complex architectural relationships.

## Architecture Layers

### Domain Layer (`domain/`)
Core business logic and entities

**Entities:**
- `User` - Represents a user with orders
- `Product` - Product catalog item with inventory
- `Order` - Order entity with items
- `OrderItem` - Value object for order line items
- `Address` - Value object for user addresses

**Services:**
- `OrderService` - Handles order creation and processing
- `InventoryService` - Manages inventory operations
- `PaymentService` - Handles payment processing

### Infrastructure Layer (`infrastructure/`)
Data persistence and external concerns

**Repositories:**
- `UserRepository` - User data access
- `ProductRepository` - Product data access
- `OrderRepository` - Order data access

### Application Layer (`application/`)
Use cases and orchestration

**Use Cases:**
- `CreateOrderUseCase` - Orchestrates order creation workflow

## Key DDD Relationships

1. **Entities** encapsulate business logic (e.g., `Order.add_item()`)
2. **Repositories** abstract data persistence
3. **Services** coordinate complex operations across entities
4. **Use Cases** orchestrate domain services for application workflows

## Complex Interactions

- `OrderService` depends on `OrderRepository`, `ProductRepository`, and `InventoryService`
- `InventoryService` calls methods on `Product` entities
- `PaymentService` depends on `OrderService` and `UserRepository`
- `CreateOrderUseCase` orchestrates `OrderService` and `InventoryService`
- Repositories reference entity classes for type hints and operations
