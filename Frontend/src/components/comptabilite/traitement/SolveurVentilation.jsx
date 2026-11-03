import { useState } from "react";
import { toast } from "sonner";
import api from "../../../services/api";

const nf = (n) => Math.round(Number(n) || 0).toLocaleString("fr-FR");

export default function SolveurVentilation({ lignes, onAppliquer }) {
    const [budget, setBudget] = useState("");
    const [avance, setAvance] = useState(false);
    const [bornes, setBornes] = useState({});          // { [rowKey]: { min, max } }
    const [enCours, setEnCours] = useState(false);
    const [resultat, setResultat] = useState(null);
    const [dureeMs, setDureeMs] = useState(null);

    const budgetNum = parseFloat(budget) || 0;
    const setBorne = (k, champ, v) =>
        setBornes((p) => ({ ...p, [k]: { ...p[k], [champ]: v } }));

    const construireArticles = () =>
    lignes.map(({ rowKey, lot, label }, i) => {
        const b = bornes[rowKey] || {};
        const min = avance ? Math.round(parseFloat(b.min) || 0) : 0;
        const max = avance ? Math.round(parseFloat(b.max) || budgetNum) : Math.round(budgetNum);
        return {
            articleId: i + 1,                                   // entier, pas le rowKey
            designation: label ? `${lot.designation} (${label})` : lot.designation,
            montantMin: min,
            montantMax: max,
        };
    });

    const lancer = async () => {
        if (budgetNum <= 0) return toast.error("Saisissez un budget total supérieur à 0.");
        const articles = construireArticles();
        if (articles.some((a) => a.montantMin > a.montantMax))
            return toast.error("Un article a un minimum supérieur à son maximum.");

        setEnCours(true);
        setResultat(null);
        const t0 = performance.now();
        try {
            const { data } = await api.post(
                `/optimisation/optimiser-repartition?budgetTotal=${Math.round(budgetNum)}`,
                articles
            );
            setDureeMs(Math.round(performance.now() - t0));
            setResultat({ ...data, sommeMin: articles.reduce((s, a) => s + a.montantMin, 0) });
            data.faisable
                ? toast.success("Ventilation optimale calculée.")
                : toast.warning("Aucune ventilation possible avec ces contraintes.");
        } catch {
            toast.error("Erreur lors de l'exécution du solveur.");
        } finally {
            setEnCours(false);
        }
    };

    const rep = resultat?.repartitionParArticle || {};
    const utilise = resultat?.budgetUtilise ?? 0;
    const reste = Math.max(budgetNum - utilise, 0);
    const taux = budgetNum > 0 ? Math.min((utilise / budgetNum) * 100, 100) : 0;

    return (
        <div className="card mt-3 p-4 border-primary">
            <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                    <h4 className="mb-1">Ventilation optimale (solveur OR-Tools)</h4>
                    <p className="text-muted mb-0">
                        Indiquez le budget total : le solveur répartit le montant entre les articles en un clic.
                    </p>
                </div>
                {dureeMs !== null && <span className="badge bg-light text-dark border">Calculé en {dureeMs} ms</span>}
            </div>

            <div className="row g-3 align-items-end mt-2">
                <div className="col-md-5">
                    <label className="form-label">Budget total à ventiler (Ar)</label>
                    <input
                        type="number" min="0" className="form-control form-control-lg"
                        value={budget} onChange={(e) => setBudget(e.target.value)}
                        placeholder="Ex : 8 000 000"
                    />
                </div>
                <div className="col-md-4">
                    <button type="button" className="btn btn-primary btn-lg w-100"
                        onClick={lancer} disabled={enCours}>
                        {enCours ? (<><span className="spinner-border spinner-border-sm me-2" />Calcul…</>)
                                 : "Calculer la ventilation optimale"}
                    </button>
                </div>
                <div className="col-md-3">
                    <button type="button" className="btn btn-link p-0"
                        onClick={() => setAvance((a) => !a)}>
                        {avance ? "Masquer les contraintes" : "Contraintes avancées (min / max)"}
                    </button>
                </div>
            </div>

            {avance && (
                <div className="table-responsive mt-3">
                    <table className="table table-sm table-bordered align-middle mb-0">
                        <thead className="table-light">
                            <tr><th>Article</th><th style={{ width: 180 }}>Min (Ar)</th><th style={{ width: 180 }}>Max (Ar)</th></tr>
                        </thead>
                        <tbody>
                            {lignes.map(({ rowKey, lot }) => (
                                <tr key={rowKey}>
                                    <td><strong>{lot.codeLot}</strong> <small className="text-muted">{lot.designation}</small></td>
                                    <td><input type="number" min="0" className="form-control form-control-sm"
                                        value={bornes[rowKey]?.min ?? ""} placeholder="0"
                                        onChange={(e) => setBorne(rowKey, "min", e.target.value)} /></td>
                                    <td><input type="number" min="0" className="form-control form-control-sm"
                                        value={bornes[rowKey]?.max ?? ""} placeholder="budget"
                                        onChange={(e) => setBorne(rowKey, "max", e.target.value)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {resultat && resultat.faisable && (
                <div className="mt-4">
                    <div className="row g-3 mb-3 text-center">
                        <div className="col-4"><div className="border rounded p-2">
                            <small className="text-muted d-block">Budget utilisé</small>
                            <strong className="text-success">{nf(utilise)} Ar</strong></div></div>
                        <div className="col-4"><div className="border rounded p-2">
                            <small className="text-muted d-block">Reste non alloué</small>
                            <strong>{nf(reste)} Ar</strong></div></div>
                        <div className="col-4"><div className="border rounded p-2">
                            <small className="text-muted d-block">Taux d'utilisation</small>
                            <strong>{taux.toFixed(1)} %</strong></div></div>
                    </div>

                    <table className="table table-sm align-middle">
                        <thead className="table-light">
                            <tr><th>Article</th><th className="text-end">Montant alloué</th><th style={{ width: "35%" }}>Part du budget</th></tr>
                        </thead>
                        <tbody>
                            {lignes.map(({ rowKey, lot, label }, i) => {
                                const m = rep[i + 1] ?? 0;
                                const part = utilise > 0 ? (m / utilise) * 100 : 0;
                                return (
                                    <tr key={rowKey}>
                                        <td><strong>{lot.codeLot}</strong> <small className="text-muted">{lot.designation}</small></td>
                                        <td className="text-end"><strong>{nf(m)} Ar</strong></td>
                                        <td>
                                            <div className="progress" style={{ height: 14 }}>
                                                <div className="progress-bar bg-success" style={{ width: `${part}%` }} />
                                            </div>
                                            <small className="text-muted">{part.toFixed(1)} %</small>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {onAppliquer && (
                        <div className="text-end">
                            <button type="button" className="btn btn-success" onClick={() => onAppliquer(rep)}>
                                Appliquer cette ventilation
                            </button>
                        </div>
                    )}
                </div>
            )}

            {resultat && !resultat.faisable && (
                <div className="alert alert-danger mt-4 mb-0">
                    <strong>Aucune ventilation possible.</strong>{" "}
                    {resultat.sommeMin > budgetNum
                        ? `La somme des minimums (${nf(resultat.sommeMin)} Ar) dépasse le budget (${nf(budgetNum)} Ar).`
                        : "Les contraintes saisies sont incompatibles entre elles."}
                </div>
            )}
        </div>
    );
}