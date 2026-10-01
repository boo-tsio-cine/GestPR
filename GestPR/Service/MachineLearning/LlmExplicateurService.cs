using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace GestPR.Service.MachineLearning
{
    public interface ILlmExplicateurService
    {
        Task<string> ExpliquerAsync(ResultatComparaisonDossier comparaison);
    }

    public class LlmExplicateurService : ILlmExplicateurService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public LlmExplicateurService(IConfiguration configuration, HttpClient httpClient)
        {
            _configuration = configuration;
            _httpClient = httpClient;
        }

        public async Task<string> ExpliquerAsync(ResultatComparaisonDossier comparaison)
        {
            if (comparaison.EcartsChiffres.Count == 0 && comparaison.DifferencesTexte.Count == 0)
                return "Aucun écart significatif détecté par rapport au traitement de référence.";

            var cleApi = _configuration["LlmApi:CleApi"];
            if (string.IsNullOrWhiteSpace(cleApi))
                return GenererTexteRepli(comparaison); // Pas de cle configuree : repli direct, aucune erreur

            try
            {
                var texteGenere = await AppellerLlmAsync(cleApi, comparaison);
                return ValiderOuRepli(texteGenere, comparaison);
            }
            catch
            {
                // Echec reseau/API/quota : le comptable ne doit jamais voir une erreur technique ici
                return GenererTexteRepli(comparaison);
            }
        }

        private async Task<string?> AppellerLlmAsync(string cleApi, ResultatComparaisonDossier comparaison)
        {
            var donneesJson = JsonSerializer.Serialize(comparaison);

            var consigne =
                "Tu es un assistant qui reformule des ecarts comptables deja calcules, en francais, " +
                "en 2 phrases maximum, claires et factuelles, a destination d'un comptable. " +
                "REGLE ABSOLUE : n'utilise QUE les chiffres et libelles fournis ci-dessous. " +
                "N'invente, ne recalcule et n'estime JAMAIS un nombre absent de ces donnees.\n\n" +
                $"Donnees : {donneesJson}";

            var requestBody = new
            {
                model = "claude-sonnet-4-5",
                max_tokens = 200,
                messages = new[] { new { role = "user", content = consigne } }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", cleApi);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseBody);
            return doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString();
        }

        // Garde-fou anti-hallucination : rejette toute phrase contenant un nombre
        // qui n'apparait dans aucune des valeurs reellement fournies au LLM.
        private static string ValiderOuRepli(string? texteGenere, ResultatComparaisonDossier comparaison)
        {
            if (string.IsNullOrWhiteSpace(texteGenere))
                return GenererTexteRepli(comparaison);

            var chiffresAutorises = comparaison.EcartsChiffres
                .SelectMany(e => new[] { e.ValeurAncienne, e.ValeurNouvelle })
                .Select(v => Math.Round(v, 0).ToString())
                .ToHashSet();

            var chiffresDansLeTexte = Regex.Matches(texteGenere, @"\d{2,}").Select(m => m.Value);

            foreach (var chiffre in chiffresDansLeTexte)
            {
                bool autorise = chiffresAutorises.Any(v => v.Contains(chiffre) || chiffre.Contains(v));
                if (!autorise)
                    return GenererTexteRepli(comparaison); // Chiffre suspect : on ecarte toute la reponse LLM
            }

            return texteGenere;
        }

        private static string GenererTexteRepli(ResultatComparaisonDossier comparaison)
        {
            if (comparaison.EcartsChiffres.Count == 0 && comparaison.DifferencesTexte.Count == 0)
                return "Aucun écart significatif détecté par rapport au traitement de référence.";

            var parties = comparaison.EcartsChiffres
                .OrderByDescending(e => Math.Abs(e.EcartPourcent ?? 0))
                .Select(e =>
                {
                    var signe = e.ValeurNouvelle > e.ValeurAncienne ? "+" : "";
                    var ecartTexte = e.EcartPourcent.HasValue ? $"{signe}{e.EcartPourcent}%" : "nouveau poste";
                    return $"{e.Libelle} : {e.ValeurAncienne:N0} → {e.ValeurNouvelle:N0} Ar ({ecartTexte})";
                })
                .Concat(comparaison.DifferencesTexte.Select(t => $"{t.Libelle} : {t.ValeurAncienne} → {t.ValeurNouvelle}"))
                .ToList();

            return string.Join(". ", parties) + ".";
        }
    }
}
