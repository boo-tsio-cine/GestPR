import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import api, { demandeService } from "../../../services/api";
import { toast } from "sonner";
import Nav from "../../nav/nav";
import "./DetectionAnomalie.css";

function ExpliquerModal({ article, onClose }) {
    if (!article) return null;

    const ecarts = article.comparaison?.ecartsChiffres || [];
    const differences = article.comparaison?.differencesTexte || [];
    const aDesDonnees = ecarts.length > 0 || differences.length > 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h5>🔍 Analyse d'écart &amp; comparaison</h5>
                    <button className="btn btn-sm btn-close" onClick={onClose}></button>
                </div>
                <div className="modal-body">
                    <p><strong>Désignation :</strong> {article.designation || "N/A"}</p>
                    <p><strong>Code Lot :</strong> {article.codeLot || "N/A"}</p>
                    <p><strong>Prix de revient :</strong> {article.prixDeRevient ? `${article.prixDeRevient.toFixed(2)} Ar` : "N/A"}</p>

                    <hr />

                    {article.chargementExplication ? (
                        <div className="text-center my-3">
                            <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                            <span className="ms-2">Analyse en cours...</span>
                        </div>
                    ) : (
                        <>
                            {article.explication && (
                                <div className="mb-3">
                                    <strong>Explication :</strong>
                                    <p className="mt-1">{article.explication}</p>
                                </div>
                            )}

                            {aDesDonnees ? (
                                <div className="table-responsive">
                                    <table className="table table-bordered table-sm align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Champ</th>
                                                <th className="text-end">Ancien (référence)</th>
                                                <th className="text-end">Nouveau (en cours)</th>
                                                <th className="text-end">Écart</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ecarts.map((e) => (
                                                <tr key={e.libelle}>
                                                    <td><strong>{e.libelle}</strong></td>
                                                    <td className="text-end">
                                                        {e.valeurAncienne != null
                                                            ? `${Math.round(e.valeurAncienne).toLocaleString("fr-FR")} Ar`
                                                            : "N/A"}
                                                    </td>
                                                    <td className="text-end">
                                                        {e.valeurNouvelle != null
                                                            ? `${Math.round(e.valeurNouvelle).toLocaleString("fr-FR")} Ar`
                                                            : "N/A"}
                                                    </td>
                                                    <td
                                                        className="text-end"
                                                        style={{
                                                            color: (e.ecartPourcent ?? 0) > 0 ? "#B3261E" : "#1E7B45",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {e.ecartPourcent != null
                                                            ? `${e.ecartPourcent > 0 ? "+" : ""}${e.ecartPourcent}%`
                                                            : "Nouveau poste"}
                                                    </td>
                                                </tr>
                                            ))}
                                            {differences.map((t) => (
                                                <tr key={t.libelle}>
                                                    <td><strong>{t.libelle}</strong></td>
                                                    <td className="text-end">{t.valeurAncienne || "N/A"}</td>
                                                    <td className="text-end">{t.valeurNouvelle || "N/A"}</td>
                                                    <td className="text-end text-muted">Modifié</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                !article.explication && (
                                    <p className="text-muted">Aucune donnée de comparaison disponible.</p>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DetectionAnomalie() {
    const { designation } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const nouveauTraitement = location.state?.nouveauTraitement || null;

    const [historique, setHistorique] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [currentPdfUrl, setCurrentPdfUrl] = useState("");
    const [pdfFileName, setPdfFileName] = useState("");
    const dialogRef = useRef(null);

    useEffect(() => {
        if (!designation) {
            toast.error("Aucune désignation spécifiée.");
            navigate("/traiter-demande");
            return;
        }
        setLoading(true);
        demandeService.getHistoriqueByDesignation(designation)
            .then((res) => {
                const data = res.data || [];
                setHistorique(data.slice(-5).reverse());
            })
            .catch((err) => {
                console.error("Erreur récupération historique :", err);
                toast.error("Impossible de charger l'historique de cet article.");
            })
            .finally(() => setLoading(false));
    }, [designation, navigate]);

    // Appelle le vrai backend : parse le PDF de reference, compare tous les postes
    // avec le traitement en cours, et renvoie l'explication (LLM ou repli).
    const expliquer = async (art) => {
        if (!nouveauTraitement) {
            toast.error("Ouvrez cette page depuis le traitement de la demande pour comparer.");
            return;
        }

        setSelectedArticle({ ...art, chargementExplication: true });

        try {
            const res = await api.post("/Anomalie/expliquer", {
                demandeIdReference: art.id || art.demandeId,
                nouveauTraitement,
            });
            setSelectedArticle({
                ...art,
                chargementExplication: false,
                explication: res.data?.data?.explication || "",
                comparaison: res.data?.data?.comparaison || null,
            });
        } catch (err) {
            console.error("Erreur explication :", err);
            toast.error("Impossible d'obtenir l'explication de l'anomalie.");
            setSelectedArticle({ ...art, chargementExplication: false });
        }
    };

    const ouvrirDialog = async (d) => {
        setSelectedDemande(d);
        setPdfFileName(d.pdfFileName || "");
        try {
            const response = await demandeService.getPdf(d.id || d.demandeId);
            const blob = new Blob([response.data], { type: "application/pdf" });
            setCurrentPdfUrl(URL.createObjectURL(blob));
        } catch (err) {
            console.error("Erreur de chargement du PDF :", err);
            setCurrentPdfUrl("");
            toast.error("Impossible de charger le document PDF.");
        }
        requestAnimationFrame(() => dialogRef.current?.showModal());
    };

    const fermerDialog = () => {
        if (currentPdfUrl && currentPdfUrl.startsWith("blob:")) {
            URL.revokeObjectURL(currentPdfUrl);
        }
        dialogRef.current?.close();
        setSelectedDemande(null);
        setCurrentPdfUrl("");
        setPdfFileName("");
    };

    const telechargerPdf = () => {
        if (!currentPdfUrl || !pdfFileName) return;
        const a = document.createElement("a");
        a.href = currentPdfUrl;
        a.download = pdfFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="detection-anomalie-page">
            <Nav />
            <div className="detection-anomalie-container">
                <div className="detection-anomalie-header">
                    <h3>🔍 Détection d'anomalie</h3>
                    <span className="designation-badge">{designation}</span>
                    <Link to="/traiter-demande" className="btn btn-secondary btn-sm">⬅️ Retour</Link>
                </div>

                {nouveauTraitement ? (
                    <div className="alert alert-info py-2 mt-3 mb-0 text-center">
                        Comparaison active avec le traitement en cours
                        {nouveauTraitement.idDemande ? ` (DEM-${String(nouveauTraitement.idDemande).padStart(3, "0")})` : ""}.
                        {/* Cliquez sur « Expliquer » pour afficher le détail poste par poste. */}
                    </div>
                ) : (
                    <div className="alert alert-warning py-2 mt-3 mb-0">
                        ℹ️ Cette page a été ouverte sans les données du traitement en cours — le bouton « Expliquer »
                        ne fonctionnera pas. Revenez au traitement de la demande et utilisez le bouton depuis cet écran.
                    </div>
                )}

                {loading ? (
                    <div className="text-center mt-4">
                        <div className="spinner-border text-primary" role="status"></div>
                        <p>Chargement de l'historique...</p>
                    </div>
                ) : historique.length === 0 ? (
                    <div className="text-center mt-4">
                        <p className="text-muted">Aucun historique disponible pour cette désignation.</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-bordered table-sm align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Date</th>
                                    <th>N° Demande</th>
                                    <th>Code Lot</th>
                                    <th>Statut</th>
                                    <th className="text-end">Prix de Revient</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historique.map((art, idx) => (
                                    <tr key={art.id || art.demandeId || idx}>
                                        <td>{art.date ? new Date(art.date).toLocaleDateString("fr-FR") : "N/A"}</td>
                                        <td>N° {String(art.id || art.demandeId || 0).padStart(3, "0")}</td>
                                        <td><span className="badge bg-secondary">{art.codeLot || "—"}</span></td>
                                        <td>
                                            <span style={{
                                                color: art.status === "Nouvelle" ? "#000927" : art.status === "En attente" ? "#854D0E" : art.status === "Validée" ? "#166534" : "#9F1239",
                                                backgroundColor: art.status === "Nouvelle" ? "#a9caf5" : art.status === "En attente" ? "#FEF9C3" : art.status === "Validée" ? "#DCFCE7" : "#FFE4E6",
                                                padding: "4px 10px",
                                                borderRadius: "9999px",
                                                fontSize: "12px",
                                                fontWeight: 500,
                                                display: "inline-block"
                                            }}>
                                                {art.status || "N/A"}
                                            </span>
                                        </td>
                                        <td className="text-end text-success">
                                            <strong>{art.prixDeRevient ? `${art.prixDeRevient.toFixed(2)} Ar` : "N/A"}</strong>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                {/* <button
                                                    className="btn btn-sm btn-info text-dark"
                                                    onClick={() => expliquer(art)}
                                                >
                                                    💡 Expliquer
                                                </button> */}
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={() => ouvrirDialog(art)}
                                                >
                                                    📄 Voir PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selectedArticle && (
                <ExpliquerModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
            )}

            <dialog ref={dialogRef} className="fiche-dialog">
                {selectedDemande && (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="m-0">Traitement de la demande DEM-{String(selectedDemande.id || selectedDemande.demandeId).padStart(3, "0")}</h5>
                            <div className="d-flex gap-2">
                                {currentPdfUrl && (
                                    <button className="btn btn-success btn-sm" onClick={telechargerPdf} title="Télécharger le PDF">
                                        📥 Télécharger
                                    </button>
                                )}
                                <button className="btn btn-close" onClick={fermerDialog}></button>
                            </div>
                        </div>
                        <div className="mb-2" style={{ flex: 1, minHeight: 0 }}>
                            {currentPdfUrl ? (
                                <iframe
                                    key={currentPdfUrl}
                                    src={currentPdfUrl}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="Aperçu PDF"
                                />
                            ) : (
                                <div className="alert alert-warning">Aucun document PDF disponible pour cette demande.</div>
                            )}
                        </div>
                    </>
                )}
            </dialog>
        </div>
    );
}
