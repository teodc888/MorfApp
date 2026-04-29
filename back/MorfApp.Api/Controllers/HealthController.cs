using Microsoft.AspNetCore.Mvc;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() =>
        Ok(new { status = "ok", timestamp = DateTime.UtcNow });
}
