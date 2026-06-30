import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, FileText, Plus, Send, Trash2 } from "lucide-react";
import Label from "../ui/label";
import Input from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Cards";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import "./demandeur.css";
import { useAuth } from "../../context/AuthContext";
import Nav from "../nav/nav";
import { articleService, demandeService } from "../../services/api";
import axios from "axios"; // Ensure axios is imported

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function emptyLot() {
    return { codeLot: "", designation: "", quantite: 1 };
}

function Demandeur() {
    // 1. Récupération des données d'authentification locales ou globales en PREMIER
    const storedUser = JSON.parse(localStorage.getItem("gestpr_user"));
    const userRole = storedUser?.role;
    const userNom = storedUser?.nom;
    const userPrenom = storedUser?.prenom;
    
    // 💡 AJOUT : Fallback sur storedUser?.username car c'est ce que renvoie l'API Windows-Login
    const userMatricule = storedUser?.AdUsername || storedUser?.matricule || storedUser.username;

    // 2. Déclaration des States
    const [demandes, setDemandes] = useState([]);
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState(null);
    const { user, loading } = useAuth();
    const [userId, setUserId] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [lots, setLots] = useState([emptyLot()]);
    const [submitting, setSubmitting] = useState(false);

    const [filtrerDate, setFiltrerDate] = useState("");
    const [filtrerStatus, setFiltrerStatus] = useState("");
    const [filtrerLots, setFiltrerLots] = useState("");
    const [filtrerCodeLot, setFiltrerCodeLot] = useState("");
    const [triDate, setTriDate] = useState("desc");

    const today = todayISO();

    // 3. Fonctions de récupération API
    const fetchDemandes = async () => {
        if (!userId) return;
        
        try {
            // 1. Une seule requête suffit, car les articles sont déjà inclus par l'API .NET !
            const res = await demandeService.getAll(userId)
            const data = res.data || [];

            const demandesFormatees = data.map((d) => ({
                id : d.id ?? d.Id,
                motif: d.motif ?? d.Motif ?? "",
                status: d.status ?? d.Status ?? "Nouvelle",
                date: d.dateTime ?? d.DateTime,
                // d.articles correspond à votre "List<ArticleResponseDto> Articles" côté C#
                lots: (d.articles ?? d.Articles ?? []).map((a) => ({
                    id: a.id ?? a.Id ?? 0,  
                    codeLot: a.codeLot ?? a.CodeLot ?? "",
                    designation: a.designation ?? a.Designation ?? ""
                }))
            }));
            setDemandes(demandesFormatees);
        }catch(err){
            console.error("Erreur fetchDemandes:", err.response?.data || err.message);
            toast.error("Impossible de charger les demandes");
            setDemandes([]);
        }
    };

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

    // 4. Gestion des formulaires
    const resetForm = () => setLots([emptyLot()]);

    const updateLot = (i, field, value) => {
        setLots((arr) => arr.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)));
    };
    
    const addLot = () => setLots((a) => [...a, emptyLot()]);
    
    const removeLot = (i) => setLots((a) => (a.length > 1 ? a.filter((_, idx) => idx !== i) : a));

    // 5. Hooks d'effets (useEffect)
    useEffect(() => {
        const initialiserComposant = async () => {
            if (loading || !userMatricule) return;
            
            try {
                const response = await axios.get(`http://localhost:5233/api/Auth/by-matricule/${userMatricule}`);
                const dbUserId = response.data.id || response.data.Id;
                setUserId(dbUserId);
            } catch (err) {
                console.error("Erreur lors de la récupération de l'ID utilisateur :", err);
                toast.error("Impossible de lier votre session à la base de données");
            }
        };

        initialiserComposant();
    }, [userMatricule, loading]);

   

    useEffect(() => {
        if (userId) {
            fetchDemandes();
        }
    }, [userId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanLots = lots
            .filter((a) => a.codeLot.trim() && a.designation.trim())
            .map((a) => ({
                codeLot: a.codeLot.trim(),
                designation: a.designation.trim(),
            }));

        if (cleanLots.length === 0) {
            toast.error("Ajoutez au moins un lot avec Code Lot et Désignation");
            return;
        }

        if (!userId) {
            toast.error("Votre identifiant utilisateur n'est pas chargé.");
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                demandeurId: parseInt(userId),
                motif: "En attente",
                articles: cleanLots.map((lot) => ({
                    codeLot: lot.codeLot,
                    designation: lot.designation
                }))
            };

            await demandeService.create(payload);
            toast.success(`Demande créée avec ${cleanLots.length} article(s)!`);

            resetForm();
            setOpen(false);
            fetchDemandes();
        } catch (err) {
            console.error("Erreur", err.response?.data || err);
            toast.error("Erreur lors de l'enregistrement");
        } finally {
            setSubmitting(false);
        }
    };

    // 6. Filtres Mémoïsés
    const demandesFiltrees = useMemo(() => {
        let result = demandes.filter((d) => {
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
    }, [demandes, filtrerDate, filtrerStatus, filtrerLots, filtrerCodeLot, triDate]);



    return (
        <main>
            <Nav/>
            <div className={`page ${open ? "blur" : ""} ${detail ? "blur" : ""}`}>
                <div className="background"></div>
                <Toaster />
                
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="gap-2 button">
                            <FileText className="h-4 w-4" /> Nouvelle demande
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="dialog_demande_content" overlayClassName="fixed inset-0 bg-black/30 backdrop-blur-sm">
                        <DialogHeader>
                            <DialogTitle>Nouvelle demande</DialogTitle>
                            <DialogDescription>
                                Ajoutez les lots à demander (Code Lot, Désignation).
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Lots</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={addLot} className="gap-1">
                                        <Plus className="h-4 w-4" /> Ajouter un lot
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {lots.map((a, i) => (
                                        <div key={i} className="form-demande">
                                            <Input
                                                className="col-span-3 input-hover"
                                                placeholder="Code Lot"
                                                value={a.codeLot}
                                                onChange={(e) => updateLot(i, "codeLot", e.target.value)}
                                                required
                                            />
                                            <Input
                                                className="col-span-6 input-hover"
                                                placeholder="Désignation"
                                                value={a.designation}
                                                onChange={(e) => updateLot(i, "designation", e.target.value)}
                                                required
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="col-span-1"
                                                onClick={() => removeLot(i)}
                                                disabled={lots.length === 1}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={submitting} className="gap-2">
                                    <Send className="h-4 w-4" />
                                    {submitting ? "Enregistrement..." : "Enregistrer"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
                
                <div className="mx-auto max-w-6xl space-y-8 divblock">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Mes demandes</h1>
                            <p className="text-muted-foreground">Créez une demande contenant un ou plusieurs lots.</p>
                        </div>
                    </header>

                    <Card className="card">
                        <CardHeader>
                            <nav className="navbar navbar-expand-lg bg-light shadow-sm rounded mb-4">
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
                </div>

                <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
                    <DialogContent className="dialog_demande_content" overlayClassName="fixed inset-0 bg-black/30 backdrop-blur-sm">
                        <DialogHeader>
                            <DialogTitle>Détail de la demande</DialogTitle>
                            <DialogDescription>
                                {detail?.date
                                    ? `Créée le ${new Date(detail.date).toLocaleString("fr-FR")}`
                                    : "Chargement des détails de la demande..."}
                            </DialogDescription>
                        </DialogHeader>
                        {detail && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>IdArticle</TableHead>
                                        <TableHead>Code Lot</TableHead>
                                        <TableHead>Désignation</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(detail.lots ?? []).map((a, i) => (
                                        <TableRow key={a.id || i}>
                                            <TableCell>{a.id}</TableCell>
                                            <TableCell className="font-mono">{a.codeLot || "—"}</TableCell>
                                            <TableCell>{a.designation || "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </main>
    );
}

function DemandesTable({ data, onDetail, empty }) {
    if (data.length === 0) {
        return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;
    }

    
    return (
        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <Table className="table">
                <TableHeader className="table_header">
                    <TableRow className="bg-gray-50 text-gray-600">
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Date</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Nombre de lots</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Statut</TableHead>
                        <TableHead className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100">
                    {data.map((d) => (
                        <TableRow key={d.id} className="transition-colors hover:bg-gray-50">
                            <TableCell className="px-4 py-3 text-sm text-gray-600">
                                {new Date(d.date).toLocaleString("fr-FR")}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <span className="inline-flex items-center justify-center rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-medium text-blue-700">
                                    {d.lots?.length ?? 0}
                                </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 status" style={{
                                color: d.status === "Nouvelle" ? "#1E40AF" : d.status === "En attente" ? "#854D0E" : d.status === "Validée" ? "#166534" : "#9F1239",
                                backgroundColor: d.status === "Nouvelle" ? "#DBEAFE" : d.status === "En attente" ? "#FEF9C3" : d.status === "Validée" ? "#DCFCE7" : "#FFE4E6",
                                
                            }}>
                                {d.status}
                            </TableCell>0
                            <TableCell className="px-4 py-3 text-right">
                                <Button size="sm" variant="outline" className="gap-1 btn_detail" onClick={() => onDetail(d)}>
                                    <Eye className="h-4 w-4" /> Détail
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default Demandeur;