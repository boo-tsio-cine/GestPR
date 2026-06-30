import { useEffect, useMemo, useState } from "react";
import { articleService, demandeService, userService } from "../../services/api";
import CrudPage from "../../page/crud_page";
import { Card, CardContent, CardHeader } from "../ui/Cards";
import Input from "../ui/input";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import { Eye} from "lucide-react";
import Nav from "../nav/nav";
import "./comptabilite.css";
import { Link } from "react-router-dom";



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


    const fetchDemandes = async() => {
        try{
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

                // On cherche l'utilisateur qui a le même ID dans la liste des utilisateurs
                const utilisateurTrouve = listeUtilisateurs.find(
                    (u) => (u.id ?? u.Id) === idDuDemandeur
                );

                return {
                    id: d.id ?? d.Id, 
                    motif: d.motif ?? d.Motif ?? "",
                    status: d.status ?? d.Status ?? "Nouvelle",
                    date: d.dateTime ?? d.DateTime,
                    demandeurId: idDuDemandeur,

                    // 👤 Si trouvé, on affiche son Nom (ajuste .nom ou .displayName selon ton API)
                    nomDemandeur : utilisateurTrouve
                        ? (utilisateurTrouve.nom || utilisateurTrouve.Nom || utilisateurTrouve.username)
                        : `Utilisateur N°${idDuDemandeur}`,
                    
                    prenomDemandeur : utilisateurTrouve
                        ? (utilisateurTrouve.prenom || utilisateurTrouve.Prenom || utilisateurTrouve.lastname)
                        : `Utilisateur N°${idDuDemandeur}`,
                    
                    matricule : utilisateurTrouve
                        ? (utilisateurTrouve.matricule || utilisateurTrouve.Matricule || utilisateurTrouve.matricule)
                        : `Utilisateur N°${idDuDemandeur}`,

                    lots: (d.articles ?? d.Articles ?? []).map((a) =>({
                        id: a.id ?? a.Id ?? 0,
                        codeLot: a.codeLot ?? a.CodeLot ?? "",
                        designation: a.designation ?? a.Designation ?? ""
                    }))
                };
            });

            setDemande(demandesFormatees);
        }catch(err){
            setError(err.message || "Erreur de chargement")
        }finally{
            setLoading(false);
        }
    }

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

    return<>
        <Nav className="navbar"/>
        <Card className="card">
            <CardHeader>
                <nav className="navbar navbar-expand-lg bg-light shadow-sm rounded mb-4 navfiltre">
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
                                    className="btn btn-outline-success w-100 bg-success text-white"
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
                <DemandesTable data={demandesFiltrees} onDetail={handleDetail} empty="Aucune demande enregistrée." />
            </CardContent>
        </Card>
    </>
}

function DemandesTable({ data, empty }) {
    if (data.length === 0) {
        return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
    }
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const date= new Date().toLocaleDateString('fr-FR', options)
    return (
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="title">
                Demande à traiter
            </div>
            {data.map((d) => (
                // const idFormate = String(d.id).padStart(3, '0');

                <div className=" card-dem" key = {d.id}>
                    <div className="card-head">
                        <time>{d.date ? new Date(d.date).toLocaleDateString('fr-FR') : "Date inconnue"}</time>
                        <div>DEM-
                            {d.id < 10 
                                ? `00${d.id}` 
                                : d.id < 100 
                                    ? `0${d.id}` 
                                    : d.id
                            }
                        </div>
                        <data value="completed" className="status-badge bg-success">{d.status}</data>
                    </div>
                    <div className="card-desc">
                        
                        <div className="card-site">
                            <div>SIEGE</div>
                        </div>
                        <div className="card-id">
                            <p>{d.nomDemandeur} {d.prenomDemandeur}</p>
                            <p>{d.matricule}</p>
                        </div>
                        <div className="card-table">
                            <div className="w-full overflow-hidden rounded-xl  border-gray-200 bg-white shadow-sm">
                                <Table className="table">
                                    
                                    <TableBody className="divide-y divide-gray-100">
                                        {
                                            d.lots && d.lots.length > 0 ? (
                                                d.lots.map((article) => (
                                                    // Toujours fournir une clé unique 'key' lors d'un .map() dans React
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
                                                // Message si la demande n'a mystérieusement aucun article
                                            <TableRow>
                                                <TableCell colSpan={2} className="px-4 py-3 text-sm text-center text-gray-400">
                                                    Aucun article pour cette demande
                                                </TableCell>
                                            </TableRow>
                                            )
                                        }
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                        <div className="card-link">
                            <Link className="btn btn-success text-white" to={`/traiter-demande/${d.id}`} style={{ display:'inline-block', textDecoration:'none'}}>
                                Traiter la demande
                            </Link>
                           
                        </div>
                    </div>
                </div>
                ))
            }
          
        </div>
    );
}

export default Comptabilite;