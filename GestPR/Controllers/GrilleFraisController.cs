using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]
public class GrilleFraisController : ControllerBase
{
    private readonly GrilleFraisService _grilleFraisService;

    public GrilleFraisController(GrilleFraisService grilleFraisService)
    {
        _grilleFraisService = grilleFraisService;
    }

    [HttpGet("{typeMatiere}")]
    public async Task<IActionResult> GetGrilleFrais(string typeMatiere)
    {
        var grille = await _grilleFraisService.GetGrilleFraisParTypeAsync(typeMatiere);

        if(grille == null)  
        {
            return NotFound($"Aucun paramètre de frais trouvé pour le type : {typeMatiere}");
        }
    

        return Ok(grille);
    }
}
