using GestPR.Models;
using MongoDB.Driver;

namespace GestPR.Repository.Audit
{
    public class AuditLogRepository
    {
        private readonly IMongoCollection<AuditLog> _collection;

        public AuditLogRepository(IMongoDatabase database)
        {
            _collection = database.GetCollection<AuditLog>("AuditLogs");

            CreateIndex();
        }

        private void CreateIndex()
        {
            var indexKeys = Builders<AuditLog>.IndexKeys.Ascending(log => log.DemandeId);
            //var indexModel = new CreateIndexModel<AuditLog>(indexKeysDefinition);
            _collection.Indexes.CreateOne(new CreateIndexModel<AuditLog>(indexKeys));
        }

        //Insertion
        public async Task CreateAsync(AuditLog log)
        {
            await _collection.InsertOneAsync(log);
        }

        public async Task<IEnumerable<AuditLog>> GetLogsByDemandeIdAsync(int demandeId)=>
            await _collection.Find(log => log.DemandeId == demandeId)
                .SortByDescending(x => x.DateAction)
                .ToListAsync();
    }
}
