using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;
// + using du namespace de Demande

namespace GestPR.Service.Receptions;

public record ReceptionResultat(int DemandeId, DateTime DateValidation, DateTime DateReception,
                                int DelaiReelJours, string? Fournisseur);

public class ReceptionService
{
    private readonly AppDbContext _db;
    public ReceptionService(AppDbContext db) => _db = db;

    public async Task<ReceptionResultat> ConfirmerAsync(int demandeId, string? fournisseur)
    {
        var d = await _db.Set<Demande>().FirstOrDefaultAsync(x => x.Id == demandeId)
                ?? throw new KeyNotFoundException($"Demande {demandeId} introuvable.");

        if (d.DateValidation is null)
            throw new InvalidOperationException("La demande n'est pas encore validée : réception impossible.");
        if (d.DateReception is not null)
            throw new InvalidOperationException("La réception de cette demande est déjà confirmée.");

        var reception = DateTime.UtcNow;
        d.DateReception = reception;
        d.DelaiReelJours = Math.Max(0, (reception.Date - d.DateValidation.Value.Date).Days);

        if (!string.IsNullOrWhiteSpace(fournisseur) && string.IsNullOrWhiteSpace(d.Fournisseur))
            d.Fournisseur = fournisseur.Trim();

        await _db.SaveChangesAsync();
        return new ReceptionResultat(d.Id, d.DateValidation.Value, reception, d.DelaiReelJours.Value, d.Fournisseur);
    }
}