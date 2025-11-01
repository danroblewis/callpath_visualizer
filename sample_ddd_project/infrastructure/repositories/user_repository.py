from domain.entities.user import User


class UserRepository:
    """Repository for managing User entities."""
    
    def __init__(self):
        self._users = {}
        self._next_id = 1
    
    def save(self, user):
        """Save or update a user."""
        self._users[user.user_id] = user
    
    def find_by_id(self, user_id):
        """Find a user by ID."""
        return self._users.get(user_id)
    
    def find_by_email(self, email):
        """Find a user by email."""
        for user in self._users.values():
            if user.email == email:
                return user
        return None
    
    def get_all(self):
        """Get all users."""
        return list(self._users.values())
    
    def delete(self, user_id):
        """Delete a user by ID."""
        if user_id in self._users:
            del self._users[user_id]
