namespace MorfApp.Domain.Entities;

public class ErrorLog
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string? TenantId { get; set; }
    public string Path { get; set; } = "";
    public string Method { get; set; } = "";
    public int StatusCode { get; set; } = 500;
    public string ExceptionType { get; set; } = "";
    public string Message { get; set; } = "";
    public string? StackTrace { get; set; }
    public bool IsResolved { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }
}
