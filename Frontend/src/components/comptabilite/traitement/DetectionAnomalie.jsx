import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { demandeService } from "../../../services/api";
import { extraireResumeDuPdf } from "../../../utils/extraireDonneesPdf";
import { toast } from "sonner";
import Nav from "../../nav/nav";
import "./DetectionAnomalie.css";

const formatAr = (v) => `${Number(v || 0).toFixed(2)} Ar`;

function ExpliquerModal({ article, comparaison, onClose }) {
    if (!article) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-md" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h5>🔍 Analyse d'Écart &amp; Comparaison</h5>
                    <button className="btn btn-sm btn-close" onClick={onClose}></button>
                </div>
                <div className="modal-body">
                    <p><strong>Désignation :</strong> {article.designation || "N/A"}</p>
                    <p><strong>Code Lot :</strong> {article.codeLot || "N/A"}</p>
                    <p><strong>Statut :</strong> {article.status || "N/A"}</p>

                    {comparaison ? (
                        <div className="alert alert-warning mt-3">
                            <h6>Analyse Comparative :</h6>
                            <ul className="mb-0">
                                <li><strong>Prix Historique (Réf DEM-{article.demandeId || article.id || "N/A"}) :</strong> {formatAr(comparaison.prixAncien)}</li>
                                <li><strong>Prix Actuel en cours :</strong> {formatAr(comparaison.prixNouveau)}</li>
                                <li>
                                    <strong>Écart constaté :</strong>{" "}
                                    <span className={comparaison.ecartAbsolu > 0 ? "text-danger" : "text-success"}>
                                        {comparaison.ecartAbsolu > 0 ? "+" : ""}{formatAr(comparaison.ecartAbsolu)} ({comparaison.ecartPourcent}%)
                                    </span>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <p><strong>Prix de revient historique :</strong> {article.prixDeRevient ? formatAr(article.prixDeRevient) : "N/A"}</p>
                    )}

                    <hr />
                    <p className="text-muted small mb-0">
                        Cet écart peut provenir d'une hausse des frais de transport, du cours de change
                        ou d'une erreur de saisie des quantités/prix FOB.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function DetectionAnomalie() {
    const { designation } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [nouveauTraitement, setNouveauTraitement] = useState(
        location.state?.nouveauTraitement || null
    );
    const [historique, setHistorique] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [comparaisonResult, setComparaisonResult] = useState(null);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [currentPdfUrl, setCurrentPdfUrl] = useState("");
    const [pdfFileName, setPdfFileName] = useState("");
    const [motif, setMotif] = useState("");
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

    const expliquerAnomalie = (artHistorique) => {
        setSelectedArticle(artHistorique);

        if (!nouveauTraitement) {
            setComparaisonResult(null);
            return;
        }
        try {
            const article = (nouveauTraitement.articles || []).find(
                (a) => a.designation === designation
            );
            const prixNouveau = article?.puAriary || 0;
            const prixAncien = artHistorique.prixDeRevient || 0;
            const ecartAbsolu = prixNouveau - prixAncien;
            const ecartPourcent = prixAncien ? Number(((ecartAbsolu / prixAncien) * 100).toFixed(2)) : 0;

            setComparaisonResult({ prixAncien, prixNouveau, ecartAbsolu, ecartPourcent });
        } catch (err) {
            console.error("Erreur de comparaison :", err);
            setComparaisonResult(null);
        }
    };

    const ouvrirDialog = async (d) => {
        setSelectedDemande(d);
        setMotif(d.motif || "");
        setPdfFileName(d.pdfFileName || "");
        try {
            const response = await demandeService.getPdf(d.id || d.demandeId);
            const blob = new Blob([response.data], { type: "application/pdf" });
            setCurrentPdfUrl(URL.createObjectURL(blob));

            if (!nouveauTraitement) {
                const resume = await extraireResumeDuPdf(blob);
                if (resume) setNouveauTraitement(resume);
            }
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
        setMotif("");
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
                    <div className="alert alert-info py-2 mt-3 mb-0">
                        Comparaison active avec le traitement en cours
                        {nouveauTraitement.idDemande ? ` (DEM-${String(nouveauTraitement.idDemande).padStart(3, "0")})` : ""}.
                        Cliquez sur « Expliquer » pour afficher l'écart.
                    </div>
                ) : (
                    <div className="alert alert-secondary py-2 mt-3 mb-0">
                        Aucun traitement en cours transmis. Ouvrez le PDF d'une demande pour charger ses données de comparaison.
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
                                                <button
                                                    className="btn btn-sm btn-info text-dark"
                                                    onClick={() => expliquerAnomalie(art)}
                                                >
                                                    💡 Expliquer
                                                </button>
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
                <ExpliquerModal
                    article={selectedArticle}
                    comparaison={comparaisonResult}
                    onClose={() => {
                        setSelectedArticle(null);
                        setComparaisonResult(null);
                    }}
                />
            )}

            <dialog ref={dialogRef} className="fiche-dialog">
                {selectedDemande && (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="m-0">Traitement de la demande DEM-{String(selectedDemande.id || selectedDemande.demandeId).padStart(3, "0")}</h5>
                            <div className="d-flex gap-2">
                                {currentPdfUrl && (
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={telechargerPdf}
                                        title="Télécharger le PDF"
                                    >
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
