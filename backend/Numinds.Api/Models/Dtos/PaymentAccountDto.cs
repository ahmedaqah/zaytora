namespace Numinds.Api.Models.Dtos;

// Mirrors src/types/api.ts -> PaymentAccountDto. Used both for the admin's
// list of every configured account and for the single, resolved account
// embedded in OrderCreatedResponse for a specific order's chosen country.
public class PaymentAccountDto
{
    public string CountryCode { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string? Iban { get; set; }
    public string? Instructions { get; set; }
}

public class PaymentAccountWriteRequest
{
    public string RecipientName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public string? Iban { get; set; }
    public string? Instructions { get; set; }
}
