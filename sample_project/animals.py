class Animal:
    """Base class for all animals."""
    
    def speak(self):
        """Make the animal speak."""
        print("Some generic animal sound")
    
    def eat(self):
        """Make the animal eat."""
        print("The animal is eating")


class Dog(Animal):
    """A dog is a type of animal."""
    
    def speak(self):
        """Make the dog bark."""
        print("Woof!")
    
    def fetch(self, owner):
        """Fetch a ball from the owner."""
        owner.throw_ball()
        print("Dog fetched the ball!")
