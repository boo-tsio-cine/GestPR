using GestPR.Dtos;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GestPR.Data;

namespace GestPR.Service.MachineLearning
{
    public class DatasetEntrainementDelaiService : IDatasetEntrainementDelaiService
    {
        private readonly AppDbContext _context;

        public DatasetEntrainementDelaiService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<DelaiEntrainementDto>> ExtraireDatasetAsync()
        {
            // On ne garde que les demandes deja completement tranchees :
            // ValidateurId + les deux dates doivent exister (remplies dans
            // SoumettreDemandeAsync / UpdateStatusAsync).
            var demandes = await _context.Demande
                .Include(d => d.Articles)
                .Where(d => d.ValidateurId != null
                         && d.DateTransmissionValidation != null
                         && d.DateValidation != null)
                .ToListAsync();

            var dataset = new List<DelaiEntrainementDto>();

            foreach (var d in demandes)
            {
                var delaiJours = (d.DateValidation!.Value - d.DateTransmissionValidation!.Value).TotalDays;

                // Securite : une donnee corrompue (dates incoherentes) ne doit pas
                // polluer l'entrainement avec un delai negatif.
                if (delaiJours < 0)
                    continue;

                var montant = d.Articles.Sum(a => a.PrixDeRevient);

                dataset.Add(new DelaiEntrainementDto
                {
                    Montant = montant,
                    ValidateurId = d.ValidateurId!.Value,
                    DelaiJours = delaiJours
                });
            }

            return dataset;
        }
    }
}
