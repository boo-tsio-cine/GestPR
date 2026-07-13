import { useEffect, useState, useRef, useMemo } from "react";
import api, { demandeService } from "../../services/api";
import { toast } from "sonner";
import Nav from "../nav/nav";

export default function Valid() {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [currentPdfUrl, setCurrentPdfUrl] = useState("");
    const [motif, setMotif] = useState("");
    const [filtreNumero, setFiltreNumero] = useState("");
    const [filtreDate, setFiltreDate] = useState("");
    const [filtreStatut, setFiltreStatut] = useState("");
    const dialogRef = useRef(null);

    const chargerDemandes = () => {
        setLoading(true);
        demandeService.get()
            .then(res => {
                const nonNouvelles = res.data.filter(d => d.status !== "Nouvelle");
                setDemandes(nonNouvelles);
            })
            .catch(err => {
                console.error(err);
                toast.error("Erreur lors du chargement des demandes.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        chargerDemandes();
    }, []);

    const ouvrirDialog = (d) => {
        setSelectedDemande(d);
        setMotif(d.motif || "");
        const baseUrl = api.defaults.baseURL ? new URL(api.defaults.baseURL).origin : "http://localhost:5233";
        const urlComplet = d.pdfFileName 
            ? `${baseUrl}/uploads/pdfs/${d.pdfFileName}`
            : "";
        setCurrentPdfUrl(urlComplet);
        dialogRef.current?.showModal();
    };

    const fermerDialog = () => {
        dialogRef.current?.close();
        setSelectedDemande(null);
        setCurrentPdfUrl("");
        setMotif("");
    };

    const handleDecision = async (id, nouveauStatut) => {
        try {
            await demandeService.updateStatus(id, nouveauStatut, motif);
            toast.success(`Demande N°${id} ${nouveauStatut.toLowerCase()} avec succès`);
            fermerDialog();
            chargerDemandes();
        } catch {
            toast.error("Impossible de mettre à jour le statut.");
        }
    };

    const demandesFiltrees = useMemo(() => {
        return demandes.filter((d) => {
            const matchNumero = String(d.id).includes(filtreNumero.trim());
            const matchDate = !filtreDate || d.dateTime?.startsWith(filtreDate);
            const matchStatut = !filtreStatut || d.status === filtreStatut;
            return matchNumero && matchDate && matchStatut;
        });
    }, [demandes, filtreNumero, filtreDate, filtreStatut]);

    if (loading) return <div className="text-center mt-5"><h5>Chargement de l'espace de validation...</h5></div>;

    return <>
    <Nav/>
        <div className="container mt-4">
            <h2 className="mb-4 text-primary">🛡️ Espace Validateur</h2>

            <div className="card mb-4 p-3">
                <h6 className="mb-3">Filtres</h6>
                <div className="row g-3">
                    <div className="col-md-4">
                        <label className="form-label">Numéro demande</label>
                        <input 
                            type="text" 
                            className="form-control"
                            placeholder="Ex: 005"
                            value={filtreNumero}
                            onChange={(e) => setFiltreNumero(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Date d'envoi</label>
                        <input 
                            type="date" 
                            className="form-control"
                            value={filtreDate}
                            onChange={(e) => setFiltreDate(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <label className="form-label">Statut</label>
                        <select 
                            className="form-select"
                            value={filtreStatut}
                            onChange={(e) => setFiltreStatut(e.target.value)}
                        >
                            <option value="">Tous</option>
                            <option value="En cours">En cours</option>
                            <option value="Validé">Validé</option>
                            <option value="Refusé">Refusé</option>
                        </select>
                    </div>
                </div>
            </div>

            {demandesFiltrees.length === 0 ? (
                <div className="alert alert-info">Aucune demande ne correspond aux critères.</div>
            ) : (
                <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle">
                        <thead className="table-dark">
                            <tr>
                                <th>N° Demande</th>
                                <th>Date d'envoi</th>
                                <th>Statut</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demandesFiltrees.map((d) => (
                                <tr key={d.id}>
                                    <td><strong>DEM-{String(d.id).padStart(3, '0')}</strong></td>
                                    <td>{new Date(d.dateTime).toLocaleDateString('fr-FR')}</td>
                                    <td>
                                        <span style={{
                                            backgroundColor: d.status === "Nouvelle" ? "#a9caf5" : d.status === "En attente" ? "#FEF9C3" : d.status === "Validée" ? "#DCFCE7" : "#FFE4E6",
                                            color: d.status === "Nouvelle" ? "#000927" : d.status === "En attente" ? "#854D0E" : d.status === "Validée" ? "#166534" : "#9F1239",
                                            padding: '0.35rem 0.6rem',
                                            borderRadius: '0.35rem',
                                            fontWeight: 500,
                                            fontSize: '0.85rem'
                                        }}>
                                            {d.status}
                                        </span>
                                    </td>
                                    <td className="text-center">
                                        <button 
                                            className="btn btn-primary btn-sm"
                                            onClick={() => ouvrirDialog(d)}
                                        >
                                            🛠️ Traiter
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <dialog 
                ref={dialogRef} 
                style={{ 
                    width: '96vw', 
                    height: '96vh', 
                    border: 'none', 
                    borderRadius: '8px', 
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {selectedDemande && (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="m-0">Traitement de la demande DEM-{String(selectedDemande.id).padStart(3, '0')}</h5>
                            <button className="btn btn-close" onClick={fermerDialog}></button>
                        </div>
                        
                        <div className="mb-2" style={{ flex: 1, minHeight: 0 }}>
                            {currentPdfUrl ? (
                                <iframe 
                                    src={currentPdfUrl} 
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                    title="Aperçu PDF"
                                />
                            ) : (
                                <div className="alert alert-warning">Aucun document PDF disponible pour cette demande.</div>
                            )}
                        </div>

                        <div className="mb-2">
                            <label className="form-label fw-bold">Motif / Commentaire</label>
                            {selectedDemande.commentaire && (
                                <div className="mb-2 p-2 border rounded bg-light">
                                    <small className="text-muted fw-bold d-block">Commentaire :</small>
                                    <div style={{ whiteSpace: "pre-wrap" }}>{selectedDemande.commentaire}</div>
                                </div>
                            )}
                            <textarea 
                                className="form-control"
                                rows="3"
                                placeholder="Écrire votre motif ou commentaire..."
                                value={motif}
                                onChange={(e) => setMotif(e.target.value)}
                            />
                        </div>

                        <div className="d-flex justify-content-center gap-3">
                            <button 
                                className="btn btn-success btn-lg"
                                onClick={() => handleDecision(selectedDemande.id, "Validée")}
                            >
                                ✔️ Valider
                            </button>
                            <button 
                                className="btn btn-danger btn-lg"
                                onClick={() => handleDecision(selectedDemande.id, "Refusée")}
                            >
                                ❌ Refuser
                            </button>
                        </div>
                    </>
                )}
            </dialog>
        </div>
    </>
}