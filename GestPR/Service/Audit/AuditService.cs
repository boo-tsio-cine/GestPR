using GestPR.Data;
using GestPR.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GestPR.Service.Audit
{
    public class AuditService : IAuditService
    {
        private readonly IMongoCollection<AuditLog> _auditCollection;
        private readonly AppDbContext _sqlContext;

        public AuditService(IMongoDatabase mongoDatabase ,IOptions<MongoDbSetting> setting, AppDbContext sqlContext)
        {
            _auditCollection = mongoDatabase.GetCollection<AuditLog>(setting.Value.CollectionName);

            // Création de l'index sur DemandeId s'il n'existe pas
            var indexKeys = Builders<AuditLog>.IndexKeys.Ascending(log => log.DemandeId);
            _auditCollection.Indexes.CreateOne(new CreateIndexModel<AuditLog>(indexKeys));

            _sqlContext = sqlContext;
        }

        public async Task LogActionAsync(AuditLog log)
        {
            if (log.DateAction == default)
            {
                log.DateAction = DateTime.UtcNow;
            }
            await _auditCollection.InsertOneAsync(log);
        }

        public async Task LogActionAsync(
            string entityName,
            int demandeId,
            int utilisateurId,
            string action,
            string nouveauStatut = "",
            string? ancienStatut = null,
            string? commentaire = null,
            object? details = null)
        {
            var log = new AuditLog
            {
                Action = action,
                DemandeId = demandeId,
                UtilisateurId = utilisateurId,
                NouveauStatut = nouveauStatut,
                AncienStatut = ancienStatut,
                Commentaire = commentaire,
                Details = details,
                DateAction = DateTime.UtcNow
            };

            await _auditCollection.InsertOneAsync(log);
        }

        public async Task<IEnumerable<AuditLog>> GetLogsByDemandeIdAsync(int demandeId)
        {
            var mongoLogs =  await _auditCollection
                .Find(log => log.DemandeId == demandeId)
                .SortByDescending(log => log.DateAction)
                .ToListAsync();

            return await EnrichLogsWithUserDataAsync(mongoLogs);
        }

        public async Task<IEnumerable<AuditLog>> GetLogsByEntityAsync(string entityName, int entityId)
        {
            var mongoLogs = await _auditCollection
                .Find(log => log.DemandeId == entityId)
                .SortByDescending(log => log.DateAction)
                .ToListAsync();

            return await EnrichLogsWithUserDataAsync(mongoLogs);
        }


        // Méthode d'enrichissement croisé Mongo <-> SQL Server
        // Méthode d'enrichissement croisé Mongo <-> SQL Server
        private async Task<IEnumerable<AuditLog>> EnrichLogsWithUserDataAsync(List<AuditLog> mongoLogs)
        {
            if (mongoLogs == null || !mongoLogs.Any())
            {
                return Enumerable.Empty<AuditLog>();
            }

            // IDs distincts des utilisateurs présents dans les logs Mongo
            var userIds = mongoLogs.Select(l => l.UtilisateurId).Distinct().ToHashSet();

            // On récupère TOUS les utilisateurs concernés en une seule requête SQL simple,
            // puis on filtre et on construit le dictionnaire en mémoire (LINQ to Objects).
            // Ça évite qu'EF Core génère un OPENJSON(...) WITH (...) non supporté par le serveur SQL.
            var usersDict = (await _sqlContext.ApplicationUsers
                    .AsNoTracking()
                    .Where(u => userIds.Contains(u.Id)) // OK ici : la traduction se fait sur une requête simple sans collection paramétrée complexe si le pb persiste, voir plan B ci-dessous
                    .ToListAsync())
                .ToDictionary(
                    u => u.Id,
                    u => new
                    {
                        NomComplet = $"{u.Prenom} {u.Nom}".Trim(),
                        Matricule = u.AdUsername
                    });

            return mongoLogs.Select(log =>
            {
                usersDict.TryGetValue(log.UtilisateurId, out var user);

                return new AuditLog
                {
                    Id = log.Id,
                    DemandeId = log.DemandeId,
                    Action = log.Action,
                    UtilisateurId = log.UtilisateurId,
                    NomUtilisateur = user != null && !string.IsNullOrWhiteSpace(user.NomComplet)
                        ? user.NomComplet
                        : "Utilisateur inconnu",
                    Matricule = user?.Matricule ?? "N/A",
                    DateAction = log.DateAction,
                    AncienStatut = log.AncienStatut,
                    NouveauStatut = log.NouveauStatut,
                    Commentaire = log.Commentaire,
                    Details = log.Details
                };
            }).ToList();
        }
    }
}