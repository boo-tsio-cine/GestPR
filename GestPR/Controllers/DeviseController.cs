using GestPR.Service;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[controller]")]

public class DeviseController : ControllerBase
{
    private readonly DeviseService _deviseService;


    public DeviseController(DeviseService deviseService)
    {
        _deviseService = deviseService;
    }

    [HttpGet]
    public async Task<IActionResult> GetDevises()
    {
        var devises = await _deviseService.GetDevisesReferentielAsync();

        return Ok(devises);
    }

}