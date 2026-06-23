using GestPR.Dtos;
using GestPR.Models;
using GestPR.Repository.Taux_Historic;

namespace GestPR.Service.Taux_Historic
{
    public class TauxService: ITauxService
    {
        private readonly ITauxRepository _tauxRepository;

        public TauxService(ITauxRepository tauxRepository)
        {
            _tauxRepository = tauxRepository;
        }

        public async Task<IEnumerable<tauxResponseDto>> GetAllTauxAsync()
        {
            var tauxList = await _tauxRepository.GetAllTauxAsync();
            return tauxList.Select(MapToDto);
        }

        public async Task<tauxResponseDto> CreateAsync(tauxCreateDto tauxCreateDto)
        {
            Valider(tauxCreateDto);

            var taux = new Taux
            {
                Nom = tauxCreateDto.Nom.Trim(),
                cle = tauxCreateDto.cle.Trim(),
                valeur = tauxCreateDto.valeur,
                unite = tauxCreateDto.unite.Trim(),
                description = tauxCreateDto.description.Trim(),
                produit = tauxCreateDto.produit.Trim(),
            };

            var created = await _tauxRepository.CreateAsync(taux);
            return MapToDto(created);
        }

        // ✅ Modification + Historique automatique
        public async Task<tauxResponseDto> UpdateAsync(int id, tauxUpdateDto tauxUpdateDto)
        {
            //// 1. Récupérer le taux existant
            var taux = await _tauxRepository.GetTauxByIdAsync(id)
                ?? throw new KeyNotFoundException($"Taux avec l'ID {id} non trouvé.");

            // 2. Sauvegarder l'ancienne valeur avant modification
            decimal ancienneValeur = taux.valeur;

            // 3. Vérifier que la valeur a vraiment changé
            if(ancienneValeur == tauxUpdateDto.valeur)
                throw new ArgumentException("La nouvelle valeur doit être différente de l'ancienne.");

            // 4. Créer l'entrée historique
            var historique = new TauxHistorique
            {
                
                NomTaux = taux.Nom,
                AncienValeur = ancienneValeur,
                NouvelleValeur = tauxUpdateDto.valeur,
                DateTime = DateTime.UtcNow,
                TauxId = taux.Id
            };

            // 5. Mettre à jour le taux
            taux.valeur = tauxUpdateDto.valeur;

            // 6. Sauvegarder les deux en une transaction
            var updated = await _tauxRepository.UpdateAvecHistoriqueAsync(taux, historique);

            return MapToDto(updated);

        }

        // Récupérer l'historique d'un taux
        public async Task<IEnumerable<tauxHistoriqueResponseDto>> GetHistoriqueAsync(int idTaux)
        {
            // Vérifier que le taux existe
            var taux = await _tauxRepository.GetTauxByIdAsync(idTaux)
                ?? throw new KeyNotFoundException($"Taux avec l'ID {idTaux} non trouvé.");
            // Récupérer l'historique
            return taux.TauxHistoriques
                .OrderByDescending(h => h.DateTime) // Trier par date décroissante
                .Select(h => new tauxHistoriqueResponseDto
                {
                    Id = h.Id,
                    NomTaux = h.NomTaux,
                    AncienValeur = h.AncienValeur,
                    NouvelleValeur = h.NouvelleValeur,
                    DateTime = DateTime.UtcNow,
                    TauxId = h.TauxId
                });

        }


        public async Task DeleteAsync(int id)
        {
            await _tauxRepository.DeleteAsync(id);
        }

        public async Task<tauxResponseDto> GetTauxByIdAsync(int id)
        {
            var taux = await _tauxRepository.GetTauxByIdAsync(id)
            
                ?? throw new KeyNotFoundException($"Taux avec l'ID {id} non trouvé.");
            return MapToDto(taux);
        }

        public async Task<int> GetTotalTauxCountAsync()
        {
            return await _tauxRepository.GetTotalTauxCountAsync();
        }


        private static void Valider(tauxCreateDto tauxCreateDto)
        {
            if (string.IsNullOrWhiteSpace(tauxCreateDto.Nom))
                throw new ArgumentException("Le nom est obligatoire");
        }


    
        //✅ MapToDto manquait aussi
        private static tauxResponseDto MapToDto(Taux o) => new()
        {
            Id = o.Id,
            Nom = o.Nom,
            cle = o.cle,
            valeur = o.valeur,
            unite = o.unite, // Mappe la colonne 'unite' de la BDD vers 'utite' du DTO
            description = o.description,
            produit = o.produit,
            
        };




    }
}
