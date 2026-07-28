namespace MorfApp.Application.DTOs.SuperAdmin;

public record ErrorLogDto(
    string Id,
    string? TenantId,
    string? TenantName,
    string Path,
    string Method,
    string ExceptionType,
    string Message,
    string? StackTrace,
    bool IsResolved,
    DateTime CreatedAt
);

public record ErrorLogListDto(
    List<ErrorLogDto> Items,
    int Total,
    int UnresolvedCount
);

public record UpdateErrorLogRequest(bool IsResolved);
