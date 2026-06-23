using GestPR.Dtos;
using GestPR.Models;
using GestPR.Repository;

namespace GestPR.Service
{
    public class OrigineService : IOrigineService
    {
        private readonly IOrigineRepository _repo;

        public OrigineService(IOrigineRepository repo)
        {
            _repo = repo;
        }

        // Récupère un article par Id — lance une exception si introuvable
        public async Task<IEnumerable<OrigineResponseDto>> GetAllAsync()
        {
            var origines = await _repo.GetAllAsync();
            return origines.Select(MapToDto);
        }


        //// ── Récupère une origine par Id 
        
        public async Task<OrigineResponseDto> GetByIdAsync(int id)
        {
            var origine = await _repo.GetByIdAsync(id)
                ?? throw new KeyNotFoundException($"Origine {id} introuvable");
            return MapToDto(origine);
        }

        public async Task<int> GetTotalOrigineCountAsync()
        {
            return await _repo.GetTotalOrigineCountAsync();
        }

        //Créer origine avec validatrion
        public async Task<OrigineResponseDto> CreateAsync(OrigineCreateDto dto)
        {
            Valider(dto);

            var origine = new Origine
            {
                pays = dto.pays.Trim(),
            };

            var created = await _repo.CreateAsync(origine);
            return MapToDto(created);
        }

        private static void Valider(OrigineCreateDto dto) 
        {
            if (string.IsNullOrWhiteSpace(dto.pays))
                throw new ArgumentException("Le pays est obligatoire");
        }

        public async Task DeleteAsync(int id)
        {
            await _repo.DeleteAsync(id);
        }

         //✅ MapToDto manquait aussi
        private static OrigineResponseDto MapToDto(Origine o) => new()
        {
            Id = o.Id,
            pays = o.pays,
        };



    }
}
