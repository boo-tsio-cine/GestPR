using Microsoft.Extensions.Caching.Distributed;

namespace GestPR.Service
{
    // Contrairement à DeviseService/NomenclatureService, il n'y a pas de table SQL
    // derrière : le cours est saisi manuellement par l'utilisateur. Redis sert ici
    // de mémoire clé-valeur pure pour retenir la dernière valeur saisie par devise,
    // et pré-remplir le formulaire lors du prochain traitement.
    public class CoursChangeService
    {
        private readonly IDistributedCache _cache;

        public CoursChangeService(IDistributedCache cache)
        {
            _cache = cache;
        }

        private static string BuildKey(string devise) => $"cours:{devise.Trim().ToLower()}";

        // Lecture : appelé quand le formulaire de traitement s'ouvre et que
        // l'utilisateur sélectionne une devise.
        public async Task<decimal?> GetDernierCoursAsync(string devise)
        {
            if (string.IsNullOrWhiteSpace(devise)) return null;

            var cacheData = await _cache.GetStringAsync(BuildKey(devise));
            if (string.IsNullOrEmpty(cacheData)) return null;

            return decimal.TryParse(cacheData, out var cours) ? cours : null;
        }

        // Écriture : appelé une fois le traitement soumis avec succès,
        // pour que le prochain traitement propose ce cours par défaut.
        public async Task SetDernierCoursAsync(string devise, decimal cours)
        {
            if (string.IsNullOrWhiteSpace(devise) || cours <= 0) return;

            var cacheOptions = new DistributedCacheEntryOptions
            {
                // Pas de table SQL de référence : on garde le dernier cours saisi
                // jusqu'à ce qu'un nouveau traitement le remplace, ou 24h max.
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
            };

            await _cache.SetStringAsync(BuildKey(devise), cours.ToString(), cacheOptions);
        }
    }
}
