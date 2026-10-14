using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http.Json;
using System.Threading.Tasks;
using FluentAssertions;
using Xunit;
using GestPR.Dtos; // Utilise vos DTOs officiels (DemandeAvecArticleCreateDto, etc.)

namespace GestPR.Tests.IntegrationTests
{
    public class ParcoursCompletIntegrationTests : IClassFixture<Helpers.CustomWebApplicationFactory<Program>>
    {
        private readonly HttpClient _client;

        public ParcoursCompletIntegrationTests(Helpers.CustomWebApplicationFactory<Program> factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Parcours_Complet_Demandeur_Comptable_Validateur_Succes()
        {
            // =========================================================================
            // ETAPE 1 : LE DEMANDEUR CREE UNE DEMANDE AVEC SES ARTICLES
            // =========================================================================
            var nouvelleDemandeDto = new DemandeAvecArticleCreateDto
            {
                DemandeurId = 1, // int selon votre DTO
                Motif = "Achat de câbles réseau et fournitures IT",
                CodeSociete = "SOC01",
                CodeMagasin = "MAG01",
                Articles = new List<ArticleCreateDto>
                {
                    new ArticleCreateDto
                    {
                        CodeLot = "LOT-2026-001",
                        CodeArticle = "ART-001",
                        Designation = "Câble Ethernet Cat6 10m",
                        DescArticle = "Lot de câbles RJ45 haute vitesse",
                        PrixDeRevient = 15000m
                    },
                    new ArticleCreateDto
                    {
                        CodeLot = "LOT-2026-002",
                        CodeArticle = "ART-002",
                        Designation = "Switch Gigabit 8 Ports",
                        DescArticle = "Commutateur réseau pour bureau",
                        PrixDeRevient = 85000m
                    }
                }
            };

            var responseCreation = await _client.PostAsJsonAsync("/api/demandes", nouvelleDemandeDto);
            responseCreation.StatusCode.Should().Be(HttpStatusCode.Created);

            var demandeCreee = await responseCreation.Content.ReadFromJsonAsync<DemandeAvecArticleResponseDto>();
            demandeCreee.Should().NotBeNull();
            demandeCreee!.Id.Should().BeGreaterThan(0);
            demandeCreee.DemandeurId.Should().Be(1);
            demandeCreee.Articles.Should().HaveCount(2);

            int demandeId = demandeCreee.Id;

            // =========================================================================
            // ETAPE 2 : LE COMPTABLE RECUPERE ET TRAITE LA DEMANDE
            // =========================================================================
            // 2a. Vérification de l'accès à la demande
            var responseGetDemande = await _client.GetAsync($"/api/demandes/{demandeId}");
            responseGetDemande.StatusCode.Should().Be(HttpStatusCode.OK);

            // 2b. Mise à jour du statut par le comptable (passage en traitement / validation)
            var traitementComptableDto = new UpdateStatusDto
            {
                Status = "EN_ATTENTE_VALIDATION",
                Motif = "Calcul des prix de revient effectué et vérifié par la comptabilité"
            };

            var responseTraitement = await _client.PutAsJsonAsync($"/api/demandes/{demandeId}/status", traitementComptableDto);
            responseTraitement.StatusCode.Should().Be(HttpStatusCode.OK);

            // =========================================================================
            // ETAPE 3 : LE VALIDATEUR REND SA DECISION FINALE
            // =========================================================================
            var decisionValidateurDto = new UpdateStatusDto
            {
                Status = "VALIDEE",
                Motif = "Validation finale accordée par le responsable"
            };

            var responseValidation = await _client.PutAsJsonAsync($"/api/demandes/{demandeId}/status", decisionValidateurDto);
            responseValidation.StatusCode.Should().Be(HttpStatusCode.OK);

            // =========================================================================
            // ETAPE 4 : VERIFICATION FINALE DE L'ETAT DU DOSSIER EN BDD
            // =========================================================================
            var responseVerification = await _client.GetAsync($"/api/demandes/{demandeId}");
            responseVerification.StatusCode.Should().Be(HttpStatusCode.OK);

            var demandeFinalisee = await responseVerification.Content.ReadFromJsonAsync<DemandeAvecArticleResponseDto>();
            demandeFinalisee.Should().NotBeNull();
            demandeFinalisee!.Status.Should().Be("VALIDEE");
            demandeFinalisee.Articles.Should().NotBeEmpty();
        }
    }
}