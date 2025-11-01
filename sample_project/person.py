from animals import Dog


class Person:
    """A person who can own pets."""
    
    def __init__(self, name):
        self.name = name
        self.pet = Dog()  # Composition relationship
    
    def throw_ball(self):
        """Throw a ball for the pet."""
        print(f"{self.name} throws a ball!")
