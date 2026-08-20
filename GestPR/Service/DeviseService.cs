using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace GestPR.Service
{
    public class DeviseService
    {
        private readonly IDistributedCache _cache;
        private readonly AppDbContext _context;


        public DeviseService(IDistributedCache cache, AppDbContext context)
        {
            _cache = cache;
            _context = context;
        }


        public async Task<List<Devise>> GetDevisesReferentielAsync()
        {

            string cacheKey = "ref_devises_list";

            // 1. Essayer de lire depuis Redis
            var cacheData = await _cache.GetStringAsync(cacheKey);
            if (!string.IsNullOrEmpty(cacheData))
            {
                return JsonSerializer.Deserialize<List<Devise>>(cacheData)!;

            }


            // 2. Si absent de Redis, lire depuis la base de données SQL
            var devises = await _context.Devises.ToListAsync();

            // 3. Stocker dans Redis avec une durée de vie (TTL)
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(8)
            };

            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(devises), cacheOptions);

            return devises;

        }

    }
}
