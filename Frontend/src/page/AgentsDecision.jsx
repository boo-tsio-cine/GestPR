import { useState } from "react";
import api from "../services/api";


const OFFRES_INITIALES = [
  { fournisseur: "SACOFRINA", prixUnitaire: 5800, delaiLivraisonJours: 15, fournisseurConnu: true },
  { fournisseur: "GASYNET IMPORT", prixUnitaire: 6100, delaiLivraisonJours: 10, fournisseurConnu: true },
  { fournisseur: "NOUVEAU_FOURNISSEUR", prixUnitaire: 8500, delaiLivraisonJours: 30, fournisseurConnu: false },
];

const BADGE_RISQUE = { "Élevé": "bg-danger", Moyen: "bg-warning text-dark", Faible: "bg-success" };
const formatAr = (n) => `${Number(n).toLocaleString("fr-FR")} Ar`;

export default function AgentsDecision() {
  const [offres, setOffres] = useState(OFFRES_INITIALES);
  const [prixMoyen, setPrixMoyen] = useState(5550);
  const [classement, setClassement] = useState(null);
  const [risque, setRisque] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  const maj = (index, champ, valeur) =>
    setOffres((prev) => prev.map((o, i) => (i === index ? { ...o, [champ]: valeur } : o)));

  const ajouterOffre = () =>
    setOffres((prev) => [...prev, { fournisseur: "", prixUnitaire: "", delaiLivraisonJours: "", fournisseurConnu: false }]);

  const supprimerOffre = (index) => setOffres((prev) => prev.filter((_, i) => i !== index));

  const analyser = async () => {
    setErreur(null);
    setClassement(null);
    setRisque(null);

    const invalide = offres.some(
      (o) => !o.fournisseur.trim() || Number(o.prixUnitaire) <= 0 || Number(o.delaiLivraisonJours) <= 0
    );
    if (offres.length === 0 || invalide) {
      setErreur("Chaque offre doit avoir un fournisseur, un prix et un délai supérieurs à 0.");
      return;
    }

    setLoading(true);
    try {
      const payload = offres.map((o) => ({
        fournisseur: o.fournisseur.trim(),
        prixUnitaire: Number(o.prixUnitaire),
        delaiLivraisonJours: Number(o.delaiLivraisonJours),
        fournisseurConnu: o.fournisseurConnu,
      }));

      // 1) Agent Négociateur : classement des offres
      const { data: resultatsNegociation } = await api.post("/agents/comparer-offres", payload);
      setClassement(resultatsNegociation);

      // 2) Agent Contrôleur : risque de l'offre recommandée
      const retenue = resultatsNegociation.find((o) => o.estRecommandee);
      const source = payload.find((o) => o.fournisseur === retenue.fournisseur);
      const { data: evaluation } = await api.post("/agents/evaluer-risque", {
        offre: source,
        prixMoyenHistorique: Number(prixMoyen),
      });
      setRisque({ ...evaluation, fournisseur: retenue.fournisseur, prixUnitaire: retenue.prixUnitaire });
    } catch (e) {
      setErreur(e.response?.data?.message ?? "Erreur lors de l'analyse des offres");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container my-4" style={{ maxWidth: 960 }}>
      {/* ---------- Saisie des offres ---------- */}
      <div className="card mb-4">
        <div className="card-header bg-primary text-white">Comparaison des offres fournisseurs</div>
        <div className="card-body">
          <p className="text-muted">
            Saisissez les offres reçues pour un même article. L'Agent Négociateur les classe, puis l'Agent
            Contrôleur évalue le risque de l'offre recommandée.
          </p>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Fournisseur</th>
                  <th style={{ width: 140 }}>Prix unitaire (Ar)</th>
                  <th style={{ width: 130 }}>Délai annoncé (j)</th>
                  <th style={{ width: 90 }}>Connu</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {offres.map((o, i) => (
                  <tr key={i}>
                    <td>
                      <input className="form-control form-control-sm" value={o.fournisseur}
                             onChange={(e) => maj(i, "fournisseur", e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" className="form-control form-control-sm" value={o.prixUnitaire}
                             onChange={(e) => maj(i, "prixUnitaire", e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" className="form-control form-control-sm" value={o.delaiLivraisonJours}
                             onChange={(e) => maj(i, "delaiLivraisonJours", e.target.value)} />
                    </td>
                    <td className="text-center">
                      <input type="checkbox" className="form-check-input" checked={o.fournisseurConnu}
                             onChange={(e) => maj(i, "fournisseurConnu", e.target.checked)} />
                    </td>
                    <td>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => supprimerOffre(i)}
                              disabled={offres.length <= 1} title="Supprimer cette offre">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            <button className="btn btn-outline-secondary btn-sm" onClick={ajouterOffre}>+ Ajouter une offre</button>
            <div className="d-flex align-items-center gap-2 ms-auto">
              <label className="form-label mb-0 small">Prix moyen historique (Ar)</label>
              <input type="number" min="0" className="form-control form-control-sm" style={{ width: 120 }}
                     value={prixMoyen} onChange={(e) => setPrixMoyen(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={analyser} disabled={loading}>
              {loading ? "Analyse en cours..." : "Analyser les offres"}
            </button>
          </div>

          {erreur && <div className="alert alert-danger mt-3 mb-0">{erreur}</div>}
        </div>
      </div>

      {/* ---------- Agent Négociateur ---------- */}
      {classement && (
        <div className="card mb-4">
          <div className="card-header">
            🤝 <strong>Agent Négociateur</strong> — Comparaison des offres{" "}
            <span className="badge bg-light text-primary border">{classement.length} fournisseurs</span>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table align-middle mb-2">
                <thead>
                  <tr>
                    <th>Fournisseur</th>
                    <th>Prix unitaire</th>
                    <th>Délai annoncé</th>
                    <th>Délai effectif</th>
                    <th>Score global</th>
                  </tr>
                </thead>
                <tbody>
                  {classement.map((o) => {
                    const ajuste = Number(o.delaiEffectifJours) !== Number(o.delaiLivraisonJours);
                    return (
                      <tr key={o.fournisseur} className={o.estRecommandee ? "table-success" : ""}>
                        <td>
                          <strong>{o.fournisseur}</strong>
                          {o.estRecommandee && <div className="small text-success fw-semibold">✓ Offre recommandée</div>}
                        </td>
                        <td>{formatAr(o.prixUnitaire)}</td>
                        <td>{o.delaiLivraisonJours} j</td>
                        <td>
                          {o.delaiEffectifJours} j
                          {ajuste && <div className="small text-muted">délai réel observé</div>}
                        </td>
                        <td><span className={`badge ${o.estRecommandee ? "bg-success" : "bg-secondary"}`}>{o.scoreGlobal}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <small className="text-muted">
              Score = 70 % prix + 30 % délai effectif (délai réel moyen si le fournisseur a au moins 3 livraisons
              confirmées, sinon délai annoncé), ramenés sur 100 par rapport à la meilleure offre.
            </small>
          </div>
        </div>
      )}

      {/* ---------- Agent Contrôleur ---------- */}
      {risque && (
        <div className="card">
          <div className="card-header">
            🛡️ <strong>Agent Contrôleur</strong> — Évaluation du risque de l'offre recommandée
          </div>
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
              <div>
                <div className="fw-semibold">{risque.fournisseur}</div>
                <div className="text-muted small">Prix unitaire : {formatAr(risque.prixUnitaire)}</div>
              </div>
              <span className={`badge fs-6 ${BADGE_RISQUE[risque.niveauRisque] ?? "bg-secondary"}`}>
                Risque {risque.niveauRisque?.toLowerCase()}
              </span>
            </div>

            {risque.motifs?.length > 0 ? (
              <ul className="list-unstyled mt-3 mb-0">
                {risque.motifs.map((m, i) => (
                  <li key={i} className="mb-1">⚠️ {m}</li>
                ))}
              </ul>
            ) : (
              <div className="alert alert-success mt-3 mb-0">Aucun motif de risque détecté.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}