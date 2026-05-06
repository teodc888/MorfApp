using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MorfApp.Application.DTOs.Admin;
using MorfApp.Application.Interfaces;
using MorfApp.Domain.Enums;
using System.Globalization;
using System.Security.Claims;

namespace MorfApp.Api.Controllers;

[ApiController]
[Route("api/admin/metrics")]
[Authorize]
public class MetricsController(IAppDbContext db) : ControllerBase
{
    private string TenantId => User.FindFirstValue("tenant_id")
        ?? throw new UnauthorizedAccessException();

    // GET /api/admin/metrics/daily?date=2025-05-02
    [HttpGet("daily")]
    public async Task<ActionResult<MetricsDto>> GetDaily([FromQuery] DateOnly? date)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == TenantId);
        if (tenant == null)
            return Unauthorized();

        var day = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var from = day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var to   = day.ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var orders = await db.Orders
            .Where(o => o.TenantId == TenantId
                     && o.Status == OrderStatus.Confirmed
                     && o.CreatedAt >= from
                     && o.CreatedAt <= to)
            .ToListAsync();

        var tz = TimeZoneInfo.FindSystemTimeZoneById(tenant.Timezone);

        var topProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.ProductId, i.ProductName })
            .Select(g => new TopProductDto(
                g.Key.ProductId,
                g.Key.ProductName,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.Quantity * i.UnitPrice)
            ))
            .OrderByDescending(p => p.Quantity)
            .Take(10)
            .ToList();

        var revenueOverTime = orders
            .GroupBy(o => TimeZoneInfo.ConvertTimeFromUtc(o.CreatedAt, tz).Hour)
            .Select(g => new RevenuePointDto(
                $"{g.Key:D2}:00",
                g.Sum(o => o.TotalPrice),
                g.Count()
            ))
            .OrderBy(h => int.Parse(h.Label.Split(':')[0]))
            .ToList();

        var ordersByHour = orders
            .GroupBy(o => TimeZoneInfo.ConvertTimeFromUtc(o.CreatedAt, tz).Hour)
            .Select(g => new OrdersByHourDto(g.Key, g.Count()))
            .OrderBy(h => h.Hour)
            .ToList();

        var totalCustomers = orders
            .Select(o => o.CustomerPhone)
            .Distinct()
            .Count();

        return Ok(BuildMetrics(orders.Count,
            orders.Sum(o => o.TotalPrice),
            topProducts,
            revenueOverTime,
            ordersByHour,
            totalCustomers));
    }

    // GET /api/admin/metrics/weekly?date=2025-05-02
    [HttpGet("weekly")]
    public async Task<ActionResult<MetricsDto>> GetWeekly([FromQuery] DateOnly? date)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == TenantId);
        if (tenant == null)
            return Unauthorized();

        var tz = TimeZoneInfo.FindSystemTimeZoneById(tenant.Timezone);
        var refDay = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

        // Semana que empieza el lunes
        var dow = (int)refDay.DayOfWeek;
        var offsetToMonday = dow == 0 ? -6 : 1 - dow;
        var monday = refDay.AddDays(offsetToMonday);
        var from = monday.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var to   = monday.AddDays(6).ToDateTime(TimeOnly.MaxValue, DateTimeKind.Utc);

        var orders = await db.Orders
            .Where(o => o.TenantId == TenantId
                     && o.Status == OrderStatus.Confirmed
                     && o.CreatedAt >= from
                     && o.CreatedAt <= to)
            .ToListAsync();

        var topProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.ProductId, i.ProductName })
            .Select(g => new TopProductDto(
                g.Key.ProductId,
                g.Key.ProductName,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.Quantity * i.UnitPrice)
            ))
            .OrderByDescending(p => p.Quantity)
            .Take(10)
            .ToList();

        var revenueOverTime = orders
            .GroupBy(o => TimeZoneInfo.ConvertTimeFromUtc(o.CreatedAt, tz).Date)
            .Select(g => new RevenuePointDto(
                g.Key.ToString("ddd dd"),
                g.Sum(o => o.TotalPrice),
                g.Count()
            ))
            .OrderBy(h => h.Label)
            .ToList();

        var totalCustomers = orders
            .Select(o => o.CustomerPhone)
            .Distinct()
            .Count();

        return Ok(BuildMetrics(orders.Count,
            orders.Sum(o => o.TotalPrice),
            topProducts,
            revenueOverTime,
            ordersByHour: null,
            totalCustomers));
    }

    // GET /api/admin/metrics/monthly?month=5&year=2025
    [HttpGet("monthly")]
    public async Task<ActionResult<MetricsDto>> GetMonthly(
        [FromQuery] int? month,
        [FromQuery] int? year)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == TenantId);
        if (tenant == null)
            return Unauthorized();

        var tz = TimeZoneInfo.FindSystemTimeZoneById(tenant.Timezone);
        var now = DateTime.UtcNow;
        var m = month ?? now.Month;
        var y = year  ?? now.Year;

        if (m < 1 || m > 12)
            return BadRequest(new { message = "El mes debe estar entre 1 y 12." });

        var from = new DateTime(y, m, 1, 0, 0, 0, DateTimeKind.Utc);
        var to   = from.AddMonths(1).AddTicks(-1);

        var orders = await db.Orders
            .Where(o => o.TenantId == TenantId
                     && o.Status == OrderStatus.Confirmed
                     && o.CreatedAt >= from
                     && o.CreatedAt <= to)
            .ToListAsync();

        var topProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.ProductId, i.ProductName })
            .Select(g => new TopProductDto(
                g.Key.ProductId,
                g.Key.ProductName,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.Quantity * i.UnitPrice)
            ))
            .OrderByDescending(p => p.Quantity)
            .Take(10)
            .ToList();

        var revenueOverTime = orders
            .GroupBy(o => TimeZoneInfo.ConvertTimeFromUtc(o.CreatedAt, tz).Date)
            .Select(g => new RevenuePointDto(
                g.Key.ToString("dd"),
                g.Sum(o => o.TotalPrice),
                g.Count()
            ))
            .OrderBy(h => int.Parse(h.Label))
            .ToList();

        var totalCustomers = orders
            .Select(o => o.CustomerPhone)
            .Distinct()
            .Count();

        return Ok(BuildMetrics(orders.Count,
            orders.Sum(o => o.TotalPrice),
            topProducts,
            revenueOverTime,
            ordersByHour: null,
            totalCustomers));
    }

    // GET /api/admin/metrics/yearly?year=2025
    [HttpGet("yearly")]
    public async Task<ActionResult<MetricsDto>> GetYearly([FromQuery] int? year)
    {
        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.Id == TenantId);
        if (tenant == null)
            return Unauthorized();

        var tz = TimeZoneInfo.FindSystemTimeZoneById(tenant.Timezone);
        var y    = year ?? DateTime.UtcNow.Year;
        var from = new DateTime(y, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var to   = new DateTime(y, 12, 31, 23, 59, 59, 999, DateTimeKind.Utc);

        var orders = await db.Orders
            .Where(o => o.TenantId == TenantId
                     && o.Status == OrderStatus.Confirmed
                     && o.CreatedAt >= from
                     && o.CreatedAt <= to)
            .ToListAsync();

        var topProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.ProductId, i.ProductName })
            .Select(g => new TopProductDto(
                g.Key.ProductId,
                g.Key.ProductName,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.Quantity * i.UnitPrice)
            ))
            .OrderByDescending(p => p.Quantity)
            .Take(10)
            .ToList();

        var revenueOverTime = orders
            .GroupBy(o => TimeZoneInfo.ConvertTimeFromUtc(o.CreatedAt, tz).Month)
            .Select(g => new RevenuePointDto(
                CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(g.Key),
                g.Sum(o => o.TotalPrice),
                g.Count()
            ))
            .OrderBy(h => Array.IndexOf(CultureInfo.CurrentCulture.DateTimeFormat.MonthNames, h.Label))
            .ToList();

        var totalCustomers = orders
            .Select(o => o.CustomerPhone)
            .Distinct()
            .Count();

        return Ok(BuildMetrics(orders.Count,
            orders.Sum(o => o.TotalPrice),
            topProducts,
            revenueOverTime,
            ordersByHour: null,
            totalCustomers));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private static MetricsDto BuildMetrics(
        int totalOrders,
        decimal totalRevenue,
        List<TopProductDto> topProducts,
        List<RevenuePointDto>? revenueOverTime,
        List<OrdersByHourDto>? ordersByHour,
        int totalCustomers)
    {
        var avg = totalOrders == 0 ? 0m : Math.Round(totalRevenue / totalOrders, 2);
        return new MetricsDto(totalOrders, totalRevenue, avg, topProducts, revenueOverTime, ordersByHour, totalCustomers);
    }
}
