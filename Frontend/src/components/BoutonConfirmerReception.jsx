import { useState } from "react";
import api from "../api/axios"; // ← remplace par ton import axios habituel

export default function BoutonConfirmerReception({ demande, onConfirmed }) {
  const [fournisseur, setFournisseur] = useState(demande.fournisseur ?? "");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);

  // Réception déjà confirmée : on affiche seulement le délai réel
  if (demande.dateReception || resultat) {
    const delai = resultat?.delaiReelJours ?? demande.delaiReelJours;
    return <span className="badge bg-success">Livré en {delai} j</span>;
  }

  // Seules les demandes validées peuvent être réceptionnées
  if (demande.status !== "Validée") return null;

  const fournisseurManquant = !demande.fournisseur && !fournisseur.trim();

  const confirmer = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const { data } = await api.post(`/receptions/${demande.id}/confirmer`, {
        fournisseur: fournisseur.trim() || null,
      });
      setResultat(data);
      onConfirmed?.(data);
    } catch (e) {
      setErreur(e.response?.data?.message ?? "Erreur lors de la confirmation de réception");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      {!demande.fournisseur && (
        <input
          className="form-control form-control-sm"
          style={{ maxWidth: 180 }}
          placeholder="Fournisseur"
          value={fournisseur}
          onChange={(e) => setFournisseur(e.target.value)}
        />
      )}
      <button
        className="btn btn-success btn-sm"
        onClick={confirmer}
        disabled={loading || fournisseurManquant}
        title={fournisseurManquant ? "Indiquez le fournisseur pour alimenter son historique" : ""}
      >
        {loading ? "Confirmation..." : "Confirmer la réception"}
      </button>
      {erreur && <small className="text-danger">{erreur}</small>}
    </div>
  );
}