using GestPR.Data;
using GestPR.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

public class GrilleFraisService
{
    private readonly IDistributedCache _cache;
    private readonly AppDbContext _context;

    public GrilleFraisService(IDistributedCache cache, AppDbContext context)
    {
        _cache = cache;
        _context = context;
    }

    public async Task<GrilleFraisDto?> GetGrilleFraisParTypeAsync(string typeMatiere)
    {
        // Clé Redis sous forme : GestPR:frais:sucre ou GestPR:frais:malt
        string cacheKey = $"frais:{typeMatiere.ToLower()}";

        // 1. Recherche dans Redis
        var cachedData = await _cache.GetStringAsync(cacheKey);
        if (!string.IsNullOrEmpty(cachedData))
        {
            return JsonSerializer.Deserialize<GrilleFraisDto>(cachedData);
        }

        // 2. Si absent de Redis, charger depuis SQL
        var fraisConfig = await _context.ParametresFrais
            .Where(p => p.TypeMatiere == typeMatiere)
            .ToListAsync();

        if (!fraisConfig.Any()) return null;

        var dto = new GrilleFraisDto
        {
            TypeMatiere = typeMatiere,
            Rubriques = fraisConfig.Select(f => new RubriqueFraisDto
            {
                CodeFrais = f.CodeFrais,
                Libelle = f.Libelle,
                ValeurParDefaut = f.ValeurParDefaut,
                EstPourcentage = f.EstPourcentage
            }).ToList()
        };

        // 3. Stocker dans Redis (durée de vie ex: 24h)
        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
        };

        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(dto), cacheOptions);

        return dto;
    }
}