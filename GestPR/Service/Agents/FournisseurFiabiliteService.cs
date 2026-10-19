using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;

namespace GestPR.Service.Agents;

public class FournisseurFiabiliteService
{
    private readonly AppDbContext _db;
    public FournisseurFiabiliteService(AppDbContext db) => _db = db;

    public async Task<(int Nb, decimal? DelaiMoyen)> GetStatsAsync(string? fournisseur)
    {
        if (string.IsNullOrWhiteSpace(fournisseur)) return (0, null);

        var delais = await _db.Set<Demande>()
            .Where(d => d.Fournisseur == fournisseur && d.DelaiReelJours != null)
            .Select(d => d.DelaiReelJours!.Value)
            .ToListAsync();

        return delais.Count == 0 ? (0, null) : (delais.Count, (decimal)delais.Average());
    }
}