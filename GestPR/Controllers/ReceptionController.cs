using GestPR.Service.Receptions;
using Microsoft.AspNetCore.Mvc;

namespace GestPR.Controllers;

[ApiController]
[Route("api/receptions")]   // ajoute le même [Authorize] que DemandeController
public class ReceptionController : ControllerBase
{
    private readonly ReceptionService _service;
    public ReceptionController(ReceptionService service) => _service = service;

    public record ConfirmerReceptionRequest(string? Fournisseur);

    [HttpPost("{demandeId:int}/confirmer")]
    public async Task<IActionResult> Confirmer(int demandeId, [FromBody] ConfirmerReceptionRequest? body)
    {
        try { return Ok(await _service.ConfirmerAsync(demandeId, body?.Fournisseur)); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return Conflict(new { message = ex.Message }); }
    }
}