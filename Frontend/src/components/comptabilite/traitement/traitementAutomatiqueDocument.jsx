// pages/TraitementAutomatiqueDocument.jsx
import React, { useState } from "react";
import api from "../../../services/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const TraitementAutomatiqueDocument = () => {
    const navigate = useNavigate();
    const [fichier, setFichier] = useState(null);
    const [enCours, setEnCours] = useState(false);
    const [resultat, setResultat] = useState(null);

    const handleUpload = async () => {
        if (!fichier) {
            toast.warning("Veuillez sélectionner un document.");
            return;
        }
        setEnCours(true);
        setResultat(null);

        try {
            const formData = new FormData();
            formData.append("fichier", fichier);

            const response = await api.post("/agents/traiter-document", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const documentId = response.data.id;

            // Le traitement par les agents est asynchrone (ils tournent en tâche de fond) :
            // on interroge l'historique toutes les secondes jusqu'à ce que le document
            // ait fini son parcours (statut "Routé") ou qu'on abandonne après 15 essais
            let tentatives = 0;
            const intervalle = setInterval(async () => {
                tentatives++;
                const historique = await api.get("/agents/historique");
                const trouve = historique.data.find((d) => d.id === documentId);

                if (trouve && (trouve.statut === "Routé" || trouve.statut.startsWith("Erreur"))) {
                    clearInterval(intervalle);
                    setResultat(trouve);
                    setEnCours(false);
                    if (trouve.statut === "Routé") {
                        toast.success("Document traité avec succès par les agents.");
                    } else {
                        toast.error("Le traitement a échoué, voir le détail ci-dessous.");
                    }
                } else if (tentatives > 15) {
                    clearInterval(intervalle);
                    setEnCours(false);
                    toast.error("Le traitement prend trop de temps, réessayez.");
                }
            }, 1000);
        } catch (error) {
            toast.error("Erreur lors de l'envoi du document.");
            setEnCours(false);
        }
    };

    return (
        <>
            <div className="container" style={{ marginTop: "10rem" }}>
                <button
                    type="button"
                    className="btn btn-secondary btn-sm mb-3"
                    onClick={() => navigate("/home@comptabilite")}
                >
                    ⬅️ Retour
                </button>
                <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
                Traitement automatique d'un document d'achat
            </div>
            <div className="card-body">
                <p className="text-muted">
                    Déposez une facture ou un document scanné : il sera lu, contrôlé et orienté
                    automatiquement par les agents, sans ressaisie manuelle.
                </p>

                <div className="mb-3">
                    <input
                        type="file"
                        className="form-control"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => setFichier(e.target.files[0])}
                    />
                </div>

                <button className="btn btn-primary" onClick={handleUpload} disabled={enCours}>
                    {enCours ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" />
                            Traitement en cours...
                        </>
                    ) : (
                        "Analyser le document"
                    )}
                </button>

                {resultat && (
                    <div className="mt-4">
                        <h6>Résultat du traitement</h6>

                        <ul className="list-group mb-3">
                            <li className="list-group-item d-flex justify-content-between">
                                <span>🔍 Agent OCR</span>
                                <span className="text-success">Texte extrait</span>
                            </li>
                            <li className="list-group-item d-flex justify-content-between">
                                <span>🛡️ Agent Contrôleur Financier</span>
                                <span className={resultat.anomalieDetectee ? "text-danger" : "text-success"}>
                                    {resultat.anomalieDetectee ? "Anomalie détectée" : "Contrôle validé"}
                                </span>
                            </li>
                            <li className="list-group-item d-flex justify-content-between">
                                <span>📍 Agent Routage</span>
                                <span>{resultat.destination || "—"}</span>
                            </li>
                        </ul>

                        <div className={`alert ${resultat.anomalieDetectee ? "alert-warning" : "alert-success"}`}>
                            <strong>Montant détecté :</strong> {resultat.montantDetecte} Ar<br />
                            <strong>Statut final :</strong> {resultat.statut}
                        </div>

                        <details className="mt-2">
                            <summary className="text-muted" style={{ cursor: "pointer" }}>
                                Voir le texte brut extrait par l'OCR
                            </summary>
                            <pre className="bg-light p-2 mt-2" style={{ whiteSpace: "pre-wrap" }}>
                                {resultat.texteExtrait}
                            </pre>
                        </details>
                    </div>
                )}
            </div>
        </div>
        </div>
        </>
    );
};

export default TraitementAutomatiqueDocument;