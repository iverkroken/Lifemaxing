using System.Globalization;

namespace Lifemaxing.Api.Common;

public static class Validation
{
    public static bool IsIanaTimeZone(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 100 || !value.Contains('/') || value.Contains('\\'))
        {
            return false;
        }

        return TimeZoneInfo.TryFindSystemTimeZoneById(value, out _);
    }

    public static bool IsLocale(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length > 20)
        {
            return false;
        }

        try
        {
            var culture = CultureInfo.GetCultureInfo(value);
            return !culture.IsNeutralCulture && string.Equals(culture.Name, value, StringComparison.OrdinalIgnoreCase);
        }
        catch (CultureNotFoundException)
        {
            return false;
        }
    }
}
