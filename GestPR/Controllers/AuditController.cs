using GestPR.Service.Audit;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace GestPR.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuditController : ControllerBase
    {
        private readonly IAuditService _auditService;

        public AuditController(IAuditService auditService)
        {
            _auditService = auditService;
        }

        [HttpGet("{entityName}/{entityId}")]
        public async Task<IActionResult> GetLogs(string entityName, int entityId)
        {
            var logs = await _auditService.GetLogsByEntityAsync(entityName, entityId);
            return Ok(logs);
        }
    }
}