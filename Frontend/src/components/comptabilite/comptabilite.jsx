import { useEffect, useMemo, useRef, useState } from "react";
import { articleService, demandeService, userService } from "../../services/api";
import api from "../../services/api";
import CrudPage from "../../page/crud_page";
import { Card, CardContent, CardHeader } from "../ui/Cards";
import Input from "../ui/input";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Eye, History} from "lucide-react";
import Nav from "../nav/nav";
import "./comptabilite.css";
import { Link } from "react-router-dom";
import AuditDialog from "../AuditDialog";


function Comptabilite(){

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [demande, setDemande] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [filtrerDate, setFiltrerDate] = useState("");
    const [filtrerStatus, setFiltrerStatus] = useState("");
    const [filtrerLots, setFiltrerLots] = useState("");
    const [filtrerCodeLot, setFiltrerCodeLot] = useState("");
    const [triDate, setTriDate] = useState("desc");
    const [detail, setDetail] = useState(null);


    const fetchDemandes = async () => {
    try {
        setLoading(true);
        setError(null);

        const [demandesRes, utilisateursRes] = await Promise.all([
            demandeService.get(),
            userService.getAll(),
        ]);

        const listeDemandes = demandesRes.data || [];
        const listeUtilisateurs = utilisateursRes.data || [];
        
        const demandesFormatees = listeDemandes.map((d) => {
            const idDuDemandeur = d.demandeurId ?? d.DemandeurId;

            const utilisateurTrouve = listeUtilisateurs.find(
                (u) => (u.id ?? u.Id) === idDuDemandeur
            );

            // Gestion souple des articles / lots
            const articlesBruts = d.articles ?? d.Articles ?? [];

            return {
                id: d.id ?? d.Id, 
                motif: d.motif ?? d.Motif ?? "",
                status: d.status ?? d.Status ?? "Nouvelle",
                date: d.dateTime ?? d.DateTime ?? d.date ?? d.Date,
                demandeurId: idDuDemandeur,
                pdfFileName: d.pdfFileName ?? d.PdfFileName ?? d.pdf ?? d.Pdf ?? "",

                site: utilisateurTrouve 
                    ? (utilisateurTrouve.site || utilisateurTrouve.Site || "") 
                    : "",

                nomDemandeur: utilisateurTrouve
                    ? (utilisateurTrouve.nom || utilisateurTrouve.Nom || utilisateurTrouve.username || utilisateurTrouve.Username)
                    : `Utilisateur N°${idDuDemandeur}`,
                
                prenomDemandeur: utilisateurTrouve
                    ? (utilisateurTrouve.prenom || utilisateurTrouve.Prenom || utilisateurTrouve.lastname)
                    : "",
                
                matricule: utilisateurTrouve
                    ? (utilisateurTrouve.matricule || utilisateurTrouve.Matricule)
                    : `N°${idDuDemandeur}`,

                lots: articlesBruts.map((a) => ({
                    id: a.id ?? a.Id ?? 0,
                    codeLot: a.codeLot ?? a.CodeLot ?? "",
                    designation: a.designation ?? a.Designation ?? ""
                }))
            };
        });

        setDemande(demandesFormatees);
    } catch(err) {
        console.error("Erreur chargement demandes:", err);
        setError(err.message || "Erreur de chargement");
    } finally {
        setLoading(false);
    }
};

    useEffect(()=>{
        fetchDemandes();
    }, [])



    const demandesFiltrees = useMemo(() => {
            let result = demande.filter((d) => {
                const matchDate = !filtrerDate || d.date?.slice(0, 10) === filtrerDate;
                const matchStatus = !filtrerStatus || d.status === filtrerStatus;
                const matchLots = !filtrerLots || (d.lots?.length ?? 0) === parseInt(filtrerLots);
                const matchCodeLot = !filtrerCodeLot || d.lots?.some((lot) => lot.codeLot?.toLowerCase().includes(filtrerCodeLot.toLowerCase()));
    
                return matchDate && matchLots && matchStatus && matchCodeLot;
            });
    
            result = result.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return triDate === "desc" ? dateB - dateA : dateA - dateB;
            });
    
            return result;
        }, [demande, filtrerDate, filtrerStatus, filtrerLots, filtrerCodeLot, triDate]);
    

    const handleDetail = async (demande) => {
        if (demande.lots && demande.lots.length > 0) {
            setDetail(demande);
            return;
        }

        setLoadingDetail(true);
        try {
            const res = await articleService.getByDemande(demande.id);
            const lots = res.data.map((a) => ({
                id: a.id || a.Id,
                codeLot: a.codeLot || a.CodeLot || "",
                designation: a.designation || a.Designation || "",
            }));
            setDetail({ ...demande, lots });
        } catch (err) {
            toast.error("Impossible de charger les articles");
        } finally {
            setLoadingDetail(false);
        }
    };

    const [auditDemandeId, setAuditDemandeId] = useState(null); 

    return<>
        <Nav className="navbar"/>
        <div className="compta">
            
        </div>
        <Card className="card">
            <CardHeader className="compta-filtre-header">
                <nav className="navbar navbar-expand-lg  shadow-sm rounded mb-4 navfiltre">
                    <div className="container-fluid">
                        <span className="navbar-brand fw-bold">Filtres</span><br/>
                        <div className="row g-3 w-100">
                            <div className="col-md-2">
                                <label htmlFor="dateFilter" className="form-label">Date</label>
                                <Input type="date" id="dateFilter" className="form-control" value={filtrerDate} onChange={(e) => setFiltrerDate(e.target.value)} />
                            </div>
                            <div className="col-md-2">
                                <label htmlFor="triDate" className="form-label">Trier par date</label>
                                <select id="triDate" className="form-select" value={triDate} onChange={(e) => setTriDate(e.target.value)}>
                                    <option value="desc">Plus récent</option>
                                    <option value="asc">Plus ancien</option>
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label htmlFor="statusFilter" className="form-label">Statut</label>
                                <select id="statusFilter" className="form-select" value={filtrerStatus} onChange={(e) => setFiltrerStatus(e.target.value)}>
                                    <option value="">Tous</option>
                                    <option value="Nouvelle">Nouvelle</option>
                                    <option value="En cours">En cours</option>
                                    <option value="En attente">En attente</option>
                                    <option value="Validée">Validée</option>
                                    <option value="Refusée">Refusée</option>
                                </select>
                            </div>
                            <div className="col-md-2">
                                <label htmlFor="lotsFilter" className="form-label">Nombre de lots</label>
                                <Input type="number" min="1" id="lotsFilter" className="form-control" placeholder="Ex: 3" value={filtrerLots} onChange={(e) => setFiltrerLots(e.target.value)} />
                            </div>
                            <div className="col-md-2">
                                <label htmlFor="codeLotFilter" className="form-label">Code Lot</label>
                                <Input type="text" id="codeLotFilter" className="form-control" placeholder="Rechercher..." value={filtrerCodeLot} onChange={(e) => setFiltrerCodeLot(e.target.value)} />
                            </div>
                            <div className="col-md-2" style={{ position: "relative", marginTop: "3rem" }}>
                                <button
                                    className="btn  w-100 btn-reinit text-white"
                                    onClick={() => {
                                        setFiltrerDate("");
                                        setFiltrerStatus("");
                                        setFiltrerLots("");
                                        setFiltrerCodeLot("");
                                        setTriDate("desc");
                                    }}
                                >
                                    Réinitialiser
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>
            </CardHeader>
            <CardContent>
                <DemandesTable 
                    data={demandesFiltrees} 
                    onDetail={handleDetail} 
                    empty="Aucune demande enregistrée." 
                    onVoirAudit={(id) => setAuditDemandeId(id)}
                />
                <AuditDialog
                    demandeId={auditDemandeId}
                    open={!!auditDemandeId}
                    onClose={() => setAuditDemandeId(null)}
                />
            </CardContent>
        </Card>
    </>
}

function DemandesTable({ data, empty, onDetail, onVoirAudit }) {
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [currentPdfUrl, setCurrentPdfUrl] = useState("");
    const [pdfFileName, setPdfFileName] = useState("");
    const [motif, setMotif] = useState("");
    const dialogRef = useRef(null);

    const ouvrirDialog = async (d) => {
        setSelectedDemande(d);
        setMotif(d.motif || "");
        setPdfFileName(d.pdfFileName || "");

        if (d.pdfFileName) {
            try {
                const response = await api.get(`/demandes/${d.id}/pdf`, {
                    responseType: "blob",
                });

                const blob = new Blob([response.data], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                setCurrentPdfUrl(url);
            } catch (err) {
                console.error("Erreur de chargement du PDF via l'API:", err);
                setCurrentPdfUrl("");
                toast.error("Impossible de charger le document PDF.");
            }
        } else {
            setCurrentPdfUrl("");
        }

        requestAnimationFrame(() => {
            dialogRef.current?.showModal();
        });
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

    if (data.length === 0) {
        return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
    }

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date = new Date().toLocaleDateString('fr-FR', options);

    return (
        <>
            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ">
                <div className="title">
                    Demande à traiter
                </div>
                {data.map((d) => (
                    <div className=" card-dem" key={d.id}>
                        <div className="card-head">
                            <time>{d.date ? new Date(d.date).toLocaleDateString('fr-FR') : "Date inconnue"}</time>
                            <div>DEM-
                                {d.id < 10 
                                    ? `00${d.id}` 
                                    : d.id < 100 
                                        ? `0${d.id}` 
                                        : d.id}
                            </div>
                            <data
                                value="completed"
                                className="status-badge"
                                style={{
                                    backgroundColor: d.status === "Nouvelle" ? "#a9caf5" : d.status === "En attente" ? "#FEF9C3" : d.status === "Validée" ? "#DCFCE7" : "#FFE4E6",
                                    color: d.status === "Nouvelle" ? "#000927" : d.status === "En attente" ? "#854D0E" : d.status === "Validée" ? "#166534" : "#9F1239",
                                    width:'8rem',
                                    height:'100%',
                                    borderRadius:'5px',
                                    textAlign:'center'
                                }}
                            >{d.status}</data>
                        </div>
                        <div className="card-desc">
                            <div className="card-site">
                                <div>{d.site || "Site inconnu"}</div>
                            </div>
                            <div className="card-id">
                                <p>{d.nomDemandeur} {d.prenomDemandeur}</p>
                                <p>{d.matricule}</p>
                            </div>
                            <div className="card-table">
                                <div className="w-full overflow-hidden rounded-xl border-gray-200 bg-white shadow-sm">
                                    <Table className="table">
                                        <TableBody className="divide-y divide-gray-100">
                                            {d.lots && d.lots.length > 0 ? (
                                                d.lots.map((article) => (
                                                    <TableRow key={article.id} className="transition-colors hover:bg-gray-50">
                                                        <TableCell className="px-4 py-3 text-sm text-gray-600">
                                                            {article.codeLot}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 status">
                                                            {article.designation}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="px-4 py-3 text-sm text-center text-gray-400">
                                                        Aucun article pour cette demande
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            <div className="card-link">
                                <button 
                                    className="btn btn-secondary text-white flex items-center gap-1"
                                    onClick={() => onVoirAudit(d.id)}
                                >
                                    <History className="h-4 w-4" /> Historique
                                </button>
                                {d.status === "Nouvelle" ? (
                                    <Link className="btn btn-success text-white" to={`/traiter-demande/${d.id}`} style={{ display:'inline-block', textDecoration:'none'}}>
                                        Traiter la demande
                                    </Link>
                                ) : (
                                    <button 
                                        className="btn text-white"
                                        onClick={() => ouvrirDialog(d)}
                                        style={{ 
                                            display:'inline-block', 
                                            textDecoration:'none',
                                            background:'rgb(114, 157, 165)',
                                            border: 'none',
                                            padding: '10px 18px',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Voir la fiche 
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <dialog 
                ref={dialogRef} 
               className="fiche-dialog"
            >
                {selectedDemande && (
                    <>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="m-0">Traitement de la demande DEM-{String(selectedDemande.id).padStart(3, '0')}</h5>
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
        </>
    );
}

export default Comptabilite;