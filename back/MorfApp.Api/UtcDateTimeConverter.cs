using System.Text.Json;
using System.Text.Json.Serialization;

namespace MorfApp.Api;

/// <summary>
/// Convierte todos los DateTime que llegan por JSON a Kind=Utc.
/// Necesario porque Npgsql 8+ rechaza DateTime con Kind=Unspecified
/// para columnas 'timestamp with time zone'.
/// </summary>
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var dt = reader.GetDateTime();
        return dt.Kind == DateTimeKind.Utc
            ? dt
            : DateTime.SpecifyKind(dt, DateTimeKind.Utc);
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime());
    }
}

public class UtcNullableDateTimeConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        var dt = reader.GetDateTime();
        return dt.Kind == DateTimeKind.Utc
            ? dt
            : DateTime.SpecifyKind(dt, DateTimeKind.Utc);
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (value is null) writer.WriteNullValue();
        else
        {
            var dt = value.Value;
            writer.WriteStringValue(dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime());
        }
    }
}
