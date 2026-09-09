using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GestPR.Service.MachineLearning
{
    // Un point de prix historique pour une désignation donnée
    public class PrixHistoriqueRecord
    {
        public string Designation { get; set; } = "";
        public decimal PrixDeRevient { get; set; }
        public DateTime Date { get; set; }
    }

    // Le dataset d'entrainement pour UNE désignation (un article)
    public class DesignationDataset
    {
        public string Designation { get; set; } = "";
        public List<PrixHistoriqueRecord> Prix { get; set; } = new();
    }

    public interface IDatasetEntrainementService
    {
        // Ne renvoie que les désignations ayant au moins "nbMinimumPourEntrainement" prix validés.
        // En dessous de ce seuil, le modèle n'a pas assez de matière pour être fiable :
        // le comptable garde alors le bouton "historique" existant comme seul repère.
        Task<List<DesignationDataset>> ExtraireDatasetAsync(int nbMinimumPourEntrainement = 5);
    }

    public class DatasetEntrainementService : IDatasetEntrainementService
    {
        private readonly AppDbContext _context;

        public DatasetEntrainementService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<DesignationDataset>> ExtraireDatasetAsync(int nbMinimumPourEntrainement = 5)
        {
            // On ne garde que les demandes VALIDEES : un dossier encore en cours de traitement
            // n'est pas une reference de prix fiable pour entrainer le modele.
            var demandesValidees = await _context.Demande
                .Where(d => d.Status == "Validé")
                .Include(d => d.Articles)
                .ToListAsync();

            var records = demandesValidees
                .SelectMany(d => d.Articles.Select(a => new PrixHistoriqueRecord
                {
                    Designation = a.Designation.Trim(),
                    PrixDeRevient = a.PrixDeRevient,
                    Date = d.DateTime
                }))
                // Nettoyage : on enleve les prix a 0/negatifs (erreurs de saisie) et designations vides
                .Where(r => r.PrixDeRevient > 0 && !string.IsNullOrWhiteSpace(r.Designation))
                .ToList();

            var dataset = records
                .GroupBy(r => r.Designation, StringComparer.OrdinalIgnoreCase)
                .Select(g => new DesignationDataset
                {
                    Designation = g.Key,
                    Prix = g.OrderBy(x => x.Date).ToList()
                })
                .Where(ds => ds.Prix.Count >= nbMinimumPourEntrainement)
                .OrderBy(ds => ds.Designation)
                .ToList();

            return dataset;
        }
    }
}