using GestPR.Dtos;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;

namespace GestPR.Service.Renaissance
{
    public class RenaissanceService
    {
        private readonly HttpClient _httpClient;
        private readonly RenaissanceDto _setting;
        private readonly IDistributedCache _cache;

        private const string CacheKeyToken = "renaissance:token";

        // AddHttpClient<RenaissanceService>() injecte directement un HttpClient prêt à l'emploi
        public RenaissanceService(HttpClient httpClient, IDistributedCache cache, IOptions<RenaissanceDto> options)
        {
            _httpClient = httpClient;
            _cache = cache;
            _setting = options.Value;
        }

        // Récupère un token valide, depuis Redis si possible (sans appeler Renaissance à chaque fois),
        // sinon en redemande un nouveau et le met en cache jusqu'à sa vraie expiration (lue dans le JWT).
        private async Task<string> GetTokenAsync()
        {
            try
            {
                var cached = await _cache.GetStringAsync(CacheKeyToken);
                if (!string.IsNullOrEmpty(cached)) return cached;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[REDIS WARNING] Lecture du token impossible, on en redemande un : {ex.Message}");
            }

            var cleApiContent = new StringContent(_setting.CleApi);
            cleApiContent.Headers.ContentType = null; // Renaissance rejette le charset auto-ajouté par StringContent

            var form = new MultipartFormDataContent
            {
                { cleApiContent, "cleAPI" }
            };

            var response = await _httpClient.PostAsync($"{_setting.BaseUrl}/Token", form);

            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"[TOKEN] Renaissance a répondu {(int)response.StatusCode} {response.StatusCode} : {responseBody}");
            }

            using var doc = JsonDocument.Parse(responseBody);
            string token = doc.RootElement.GetProperty("Value").GetString()
                ?? throw new InvalidOperationException("Token Renaissance vide dans la réponse.");

            var ttl = GetJwtRemainingLifetime(token) ?? TimeSpan.FromMinutes(30); // repli si on n'arrive pas à lire l'expiration
            var ttlAvecMarge = ttl > TimeSpan.FromMinutes(1) ? ttl - TimeSpan.FromMinutes(1) : ttl;

            try
            {
                await _cache.SetStringAsync(CacheKeyToken, token, new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = ttlAvecMarge
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[REDIS WARNING] Mise en cache du token impossible : {ex.Message}");
            }

            return token;
        }

        // Lit la date d'expiration ("exp") directement dans le JWT, sans dépendance externe
        private static TimeSpan? GetJwtRemainingLifetime(string jwt)
        {
            try
            {
                var parts = jwt.Split('.');
                if (parts.Length < 2) return null;

                string payload = parts[1].Replace('-', '+').Replace('_', '/');
                switch (payload.Length % 4)
                {
                    case 2: payload += "=="; break;
                    case 3: payload += "="; break;
                }

                var json = Encoding.UTF8.GetString(Convert.FromBase64String(payload));
                using var doc = JsonDocument.Parse(json);

                if (doc.RootElement.TryGetProperty("exp", out var expElement))
                {
                    long expUnix = expElement.GetInt64();
                    var expDate = DateTimeOffset.FromUnixTimeSeconds(expUnix);
                    var remaining = expDate - DateTimeOffset.UtcNow;
                    return remaining > TimeSpan.Zero ? remaining : TimeSpan.Zero;
                }
            }
            catch
            {
                // JWT non décodable : on utilisera le TTL de repli
            }
            return null;
        }

        // Recherche des articles Renaissance dont le PartCode contient le terme recherché.
        // Retourne la liste des PartCode distincts (c'est ce qui sert de "désignation" côté GestPR).
        public async Task<List<string>> RechercherPartCodesAsync(string codeArticleRecherche)
        {
            if (string.IsNullOrWhiteSpace(codeArticleRecherche)) return new List<string>();

            var token = await GetTokenAsync();

            var url = $"{_setting.BaseUrl}/Articles?codeArticle={Uri.EscapeDataString(codeArticleRecherche)}" +
           $"&codeMagasin={Uri.EscapeDataString(_setting.CodeMagasin)}" +
           $"&codeSociete={Uri.EscapeDataString(_setting.CodeSociete)}";

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);

            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                throw new HttpRequestException(
                    $"[ARTICLES] Renaissance a répondu {(int)response.StatusCode} {response.StatusCode} : {body}");
            }

            using var doc = JsonDocument.Parse(body);

            var partCodes = new List<string>();
            if (doc.RootElement.TryGetProperty("Data", out var dataElement))
            {
                foreach (var item in dataElement.EnumerateArray())
                {
                    if (item.TryGetProperty("PartCode", out var pc))
                    {
                        var value = pc.GetString();
                        if (!string.IsNullOrWhiteSpace(value)) partCodes.Add(value);
                    }
                }
            }

            return partCodes.Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(x => x).ToList();
        }
    }
}