namespace MorfApp.Api;

// Helper compartido para generar archivos CSV (separador ';', UTF-8 con BOM) desde los controllers de export.
public static class CsvHelper
{
    public static string EscapeCsv(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return string.Empty;

        if (value.Contains(';') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }

    public static byte[] ToUtf8BomBytes(string csvContent)
    {
        var preamble = System.Text.Encoding.UTF8.GetPreamble();
        var contentBytes = System.Text.Encoding.UTF8.GetBytes(csvContent);
        var result = new byte[preamble.Length + contentBytes.Length];
        Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
        Buffer.BlockCopy(contentBytes, 0, result, preamble.Length, contentBytes.Length);
        return result;
    }
}
