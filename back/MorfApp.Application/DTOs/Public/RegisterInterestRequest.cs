namespace MorfApp.Application.DTOs.Public;

public record RegisterInterestRequest(
    string FirstName,
    string LastName,
    string Email,
    string Phone,
    string RestaurantName,
    string Plan
);
