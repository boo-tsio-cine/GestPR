import { useEffect, useMemo, useState, useRef } from "react";
import { toast, Toaster } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Eye, FileText, HistoryIcon, Plus, Send, Trash2 } from "lucide-react";
import Label from "../ui/label";
import Input from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Cards";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import "./demandeur.css";
import { useAuth } from "../../context/AuthContext";
import Nav from "../nav/nav";
import { articleService, demandeService, directRenaissanceService, userService } from "../../services/api";
import api from "../../services/api";
import axios from "axios"; // Ensure axios is imported
import AuditDialog from "../AuditDialog";

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
    const [audit, setAudit] = useState(null);


    const { user, loading } = useAuth();
    const [userId, setUserId] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [lots, setLots] = useState([emptyLot()]);
    const [submitting, setSubmitting] = useState(false);

    const [openPdf, setOpenPdf] = useState(false);
    const [selectedPdf, setSelectedPdf] = useState("");
    const dialogPdfRef = useRef(null);

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
                pdfFileName: d.pdfFileName ?? d.PdfFileName ?? "",
                lots: (d.articles ?? d.Articles ?? []).map((a) => ({
                    id: a.id ?? a.Id ?? 0,  
                    codeLot: a.codeLot ?? a.CodeLot ?? "",
                    designation: a.designation ?? a.Designation ?? "",
                    codeArticle: a.codeArticle ?? a.CodeArticle ?? "",
                    description: a.descArticle ?? a.DescArticle ?? ""
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
                motif: a.motif || a.Motif || "",
                codeArticle: a.codeArticle || a.CodeArticle || "",
                description: a.descArticle || a.DescArticle || ""
            }));
            setDetail({ ...demande, lots });
        } catch (err) {
            toast.error("Impossible de charger les articles");
        } finally {
            setLoadingDetail(false);
        }
    };

   const ouvrirPdf = async (d) => {
        if (!d.pdfFileName) {
            toast.error("Aucun PDF disponible pour cette demande");
            return;
        }

        const baseUrl = api.defaults.baseURL 
            ? new URL(api.defaults.baseURL).origin 
            : "http://localhost:5000";
            
        const pdfUrl = `${baseUrl}/uploads/pdfs/${d.pdfFileName}`;

        try {
            // 1. On récupère le fichier en brut (ArrayBuffer/Blob) via Axios
            const response = await axios.get(pdfUrl, {
                responseType: 'blob' 
            });

            // 2. On crée un Blob spécifique pour le PDF
            const blob = new Blob([response.data], { type: 'application/pdf' });

            // 3. On génère une URL locale (blob:http://...) que l'iframe sait lire nativement
            const localPdfUrl = window.URL.createObjectURL(blob);

            setSelectedPdf(localPdfUrl);
            setOpenPdf(true);
        } catch (err) {
            console.error("Erreur de chargement du PDF :", err);
            toast.error("Impossible de charger l'aperçu du PDF");
        }
    };

    const fermerPdf = () => {
        setOpenPdf(false);
        // Important : Libérer la mémoire du navigateur en révoquant l'URL du blob
        if (selectedPdf && selectedPdf.startsWith("blob:")) {
            window.URL.revokeObjectURL(selectedPdf);
        }
        setSelectedPdf("");
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
            // Si le contexte d'authentification charge ou si aucun matricule n'est trouvé en local, on patiente
            if (loading || !userMatricule) return;
            
            try {
                // CORRECTION : On passe par l'instance "api" configurée (qui contient withCredentials et l'adresse de prod/locale)
                // ou directement par le service userService.idMatricule(userMatricule)
                const response = await userService.idMatricule(userMatricule);
                
                const dbUserId = response.data.id ?? response.data.Id;
                if (dbUserId) {
                    setUserId(dbUserId);
                } else {
                    console.warn("L'ID utilisateur n'a pas pu être extrait de la réponse :", response.data);
                }
            } catch (err) {
                console.error("Erreur lors de la récupération de l'ID utilisateur :", err);
                toast.error("Impossible de lier votre session à la base de données.");
            }
        };

        initialiserComposant();
    }, [userMatricule, loading]);
   

    useEffect(() => {
        if (userId) {
            fetchDemandes();
        }
    }, [userId]);


    // Les 3 catégories fixes proposées dans le champ "Désignation".
    // Ce sont les termes envoyés à Renaissance comme filtre "codeArticle" (recherche par sous-chaîne).
    // Code Magasin / Code Société : influencent la recherche d'articles Renaissance.
    // Valeurs par défaut basées sur les tests réels (S4 / A), modifiables par l'utilisateur.
    const [codeMagasin, setCodeMagasin] = useState("");
    const [codeSociete, setCodeSociete] = useState("");

    const CATEGORIES_DESIGNATION = [
        { value: "BOUCHON", label: "Bouchon" },
        { value: "PREF", label: "Preform" },
        { value: "CAPCAP", label: "Capcap" },
    ];

    // Résultats (PartCode) de la recherche Renaissance, par ligne de lot (clé = index i)
    const [partCodesByRow, setPartCodesByRow] = useState({});
    const [loadingPartCodesByRow, setLoadingPartCodesByRow] = useState({});

    // Appelée quand l'utilisateur choisit une catégorie dans "Désignation" :
    // va chercher chez Renaissance tous les PartCode correspondants, pour peupler le 2e menu.
    const fetchPartCodes = async (i, categorie) => {
        if (!categorie) {
            setPartCodesByRow((prev) => ({ ...prev, [i]: [] }));
            return;
        }
        setLoadingPartCodesByRow((prev) => ({ ...prev, [i]: true }));
        try {
            const data = await directRenaissanceService.getArticlesByCode(categorie, codeMagasin, codeSociete);
            const articlesList = data?.Data || data || [];
            const partCodes = [...new Set(articlesList.map((item) => item.PartCode).filter(Boolean))];
            setPartCodesByRow((prev) => ({ ...prev, [i]: partCodes }));
        } catch (err) {
            console.error("Erreur d'accès direct à l'ERP Renaissance :", err);
            toast.error("Impossible de récupérer les articles Renaissance pour cette catégorie.");
            setPartCodesByRow((prev) => ({ ...prev, [i]: [] }));
        } finally {
            setLoadingPartCodesByRow((prev) => ({ ...prev, [i]: false }));
        }
    };

    // 2. (fonction retirée : fetchProduitByCode était du code mort, jamais appelé,
    //    et écrivait par erreur dans "designation" au lieu de "description")

   // États pour gérer les listes par ligne
const [articlesByRow, setArticlesByRow] = useState({}); // Articles issus d'une recherche par désignation
const [allArticles, setAllArticles] = useState([]);     // Liste globale des articles si besoin
const [loadingRow, setLoadingRow] = useState({});

// 1. L'utilisateur sélectionne une DÉSIGNATION
const handleDesignationChange = async (index, designationValue) => {
    updateLot(index, "designation", designationValue);
    updateLot(index, "codeArticle", "");
    updateLot(index, "description", "");

    if (!designationValue) {
        setArticlesByRow((prev) => ({ ...prev, [index]: [] }));
        return;
    }

    setLoadingRow((prev) => ({ ...prev, [index]: true }));

    try {
        const data = await directRenaissanceService.getArticlesByCode(
            designationValue,
            codeMagasin,
            codeSociete
        );
        const articlesBruts = data?.Data || data || [];

        // ⚠️ /Articles ne renvoie PAS PartDesc1 — il faut interroger /Produit
        // pour CHAQUE PartCode trouvé, afin de récupérer sa vraie description.
        const codesUniques = [...new Set(articlesBruts.map((item) => item.PartCode).filter(Boolean))];

        const articles = await Promise.all(
            codesUniques.map(async (partCode) => {
                try {
                    const detail = await directRenaissanceService.getProduitBycode(partCode, codeMagasin, codeSociete);
                    const produits = detail?.Data || detail || [];
                    const produit = Array.isArray(produits) ? produits[0] : produits;
                    return {
                        PartCode: partCode,
                        PartDesc1: produit?.PartDesc1 || partCode, // repli sur le code si pas de description trouvée
                    };
                } catch (err) {
                    console.error(`Impossible de récupérer la description pour ${partCode} :`, err);
                    return { PartCode: partCode, PartDesc1: partCode };
                }
            })
        );

        setArticlesByRow((prev) => ({ ...prev, [index]: articles }));

        // Si une seule Description (PartDesc1) existe pour cette désignation
        const descriptionsUniques = [
            ...new Set(articles.map((item) => item.PartDesc1).filter(Boolean))
        ];

        if (descriptionsUniques.length === 1) {
            updateLot(index, "description", descriptionsUniques[0]);
            
            // Auto-sélection du Code Article s'il est unique
            const codesUniquesFinal = [...new Set(articles.map((item) => item.PartCode).filter(Boolean))];
            if (codesUniquesFinal.length === 1) {
                updateLot(index, "codeArticle", codesUniquesFinal[0]);
            }
        }
    } catch (err) {
        console.error("Erreur d'accès à l'ERP Renaissance :", err);
        toast.error("Impossible de récupérer les articles.");
        setArticlesByRow((prev) => ({ ...prev, [index]: [] }));
    } finally {
        setLoadingRow((prev) => ({ ...prev, [index]: false }));
    }
};

// 2. L'utilisateur sélectionne un CODE ARTICLE dans la liste
const handleCodeArticleChange = (index, codeArticle) => {
    updateLot(index, "codeArticle", codeArticle);

    if (!codeArticle) return;

    const articles = articlesByRow[index] || [];
    const matchedArticle = articles.find((a) => a.PartCode === codeArticle);

    if (matchedArticle && matchedArticle.PartDesc1) {
        updateLot(index, "description", matchedArticle.PartDesc1);
    }
};

// 3. L'utilisateur sélectionne une DESCRIPTION (PartDesc1) dans la liste
const handleDescriptionChange = (index, selectedDesc) => {
    updateLot(index, "description", selectedDesc);

    const articles = articlesByRow[index] || [];
    
    // Trouver l'article correspondant à la description choisie
    const matchedArticle = articles.find((a) => a.PartDesc1 === selectedDesc);

    if (matchedArticle) {
        // Remplir le Code Article automatiquement
        if (matchedArticle.PartCode) {
            updateLot(index, "codeArticle", matchedArticle.PartCode);
        }

        // Remplir la Désignation automatiquement si elle provient de l'article ERP
        const designationERP = matchedArticle.Category || matchedArticle.FamilleArticle || matchedArticle.PartGroup;
        if (designationERP) {
            updateLot(index, "designation", designationERP);
        }
    }
};

    // Fonction pour ajouter un nouveau lot avec le premier code de la liste par défaut
    // const addLot = () => {
    //     const defaultCode = codeArticleOptions[0] || "";
    //     setLots((a) => [...a, { codeArticle: defaultCode, codeLot: "", designation: "", quantite: 1 }]);
    // };
    

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanLots = lots
            .filter((a) => a.codeLot.trim() && a.designation.trim())
            .map((a) => ({
                codeLot: a.codeLot.trim(),
                designation: a.designation.trim(),
                codeArticle: (a.codeArticle || "").trim(),
                description: (a.description || "").trim(),
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
                motif: "",
                codeSociete: codeSociete,
                codeMagasin: codeMagasin,
                articles: cleanLots.map((lot) => ({
                    codeLot: lot.codeLot,
                    designation: lot.designation,
                    codeArticle: lot.codeArticle,
                    descArticle: lot.description
                }))
            };

            // Envoi à l'API via le service demandeService
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

    const [auditDemandeId, setAuditDemandeId] = useState(null); // 👈 État pour la modal audit


    
    return (    
        <main>
            <Nav/>
            {/* On applique le flou uniquement sur le fond de page quand un dialog classique est ouvert */}
            <div className={`page ${open ? "blur" : ""} ${detail ? "blur" : ""}`}>
                <div className="background"></div>
                <Toaster />
                
                {/* 1. Dialogue Nouvelle Demande */}
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

                                <div className="d-flex gap-3 mb-2">
                                    <div className="">
                                        <Label className="text-xs text-gray-500">Code Magasin</Label><br />
                                        <Input
                                            className="input-hover"
                                            placeholder="ex: S4"
                                            value={codeMagasin}
                                            onChange={(e) => setCodeMagasin(e.target.value)}
                                        />
                                    </div>
                                    <div className="">
                                        <Label className="text-xs text-gray-500">Code Société</Label><br />
                                        <Input
                                            className="input-hover"
                                            placeholder="ex: A"
                                            value={codeSociete}
                                            onChange={(e) => setCodeSociete(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {lots.map((a, i) => {
                                        const currentArticles = articlesByRow[i] || [];
                                        const availableCodes = [...new Set(currentArticles.map((item) => item.PartCode).filter(Boolean))];
                                        const availableDescriptions = [...new Set(currentArticles.map((item) => item.PartDesc1).filter(Boolean))];

                                        const isSingleDescription = availableDescriptions.length === 1;

                                        return (
                                            <div key={i} className="form-demande grid grid-cols-12 gap-2 items-center border-b pb-3">
                                                <div className="art" >
                                                    {/* 1. Code Lot (Seul champ texte de saisie) */}
                                                    <div className="col-span-3">
                                                        <Input
                                                            className="input-hover"
                                                            placeholder="Code Lot"
                                                            value={a.codeLot || ""}
                                                            onChange={(e) => updateLot(i, "codeLot", e.target.value)}
                                                            required
                                                        />
                                                    </div>

                                                    {/* 2. Désignation (SELECT) */}
                                                    <div className="col-span-3">
                                                        <select
                                                            className="form-select text-sm w-full input-hover rounded-md border border-gray-300 p-2"
                                                            value={a.designation || ""}
                                                            onChange={(e) => handleDesignationChange(i, e.target.value)}
                                                            required
                                                        >
                                                            <option value="">Sélectionner une désignation</option>
                                                            {CATEGORIES_DESIGNATION.map((cat) => (
                                                                <option key={cat.value} value={cat.value}>
                                                                    {cat.label}
                                                                </option>
                                                            ))}
                                                            {/* Option dynamique si la désignation provient de l'ERP */}
                                                            {a.designation && !CATEGORIES_DESIGNATION.some((c) => c.value === a.designation) && (
                                                                <option value={a.designation}>{a.designation}</option>
                                                            )}
                                                        </select>
                                                    </div>

                                                    {/* 3. Code Article (SELECT) */}
                                                    <div className="col-span-3">
                                                        <select
                                                            className="form-select text-sm w-full input-hover rounded-md border border-gray-300 p-2"
                                                            value={a.codeArticle || ""}
                                                            onChange={(e) => handleCodeArticleChange(i, e.target.value)}
                                                            disabled={loadingRow[i] || availableCodes.length === 0}
                                                        >
                                                            <option value="">
                                                                {availableCodes.length === 0 ? "Choisir désignation d'abord" : "Sélectionner un code"}
                                                            </option>
                                                            {availableCodes.map((code) => (
                                                                <option key={code} value={code}>
                                                                    {code}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* 4. Description (PartDesc1) - Readonly ou SELECT */}
                                                    <div className="col-span-3">
                                                        {isSingleDescription ? (
                                                            // Champ figé en lecture seule s'il n'y a qu'une seule description disponible
                                                            <Input
                                                                className="bg-gray-100 text-gray-700 cursor-not-allowed text-sm p-2 rounded-md border"
                                                                value={a.description || availableDescriptions[0] || ""}
                                                                readOnly
                                                                placeholder="Description unique"
                                                            />
                                                        ) : (
                                                            // Liste déroulante des descriptions si plusieurs choix existent
                                                            <select
                                                                className="form-select text-sm w-full input-hover rounded-md border border-gray-300 p-2"
                                                                value={a.description || ""}
                                                                onChange={(e) => handleDescriptionChange(i, e.target.value)}
                                                                disabled={loadingRow[i] || availableDescriptions.length === 0}
                                                            >
                                                                <option value="">
                                                                    {availableDescriptions.length === 0 ? "Aucune description" : "Sélectionner une description"}
                                                                </option>
                                                                {availableDescriptions.map((desc, idx) => (
                                                                    <option key={idx} value={desc}>
                                                                        {desc}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 5. Supprimer */}
                                                <div className="col-span-1 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeLot(i)}
                                                        disabled={lots.length === 1}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                
                {/* Tableau principal et Filtres */}
                <div className="mx-auto max-w-6xl space-y-8 divblock">
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Mes demandes</h1>
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
                                                <option value="En cours">En cours</option>
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
                                                className="btn w-100 btn-reinit text-white"
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
                                onVoirPdf={ouvrirPdf} 
                                onVoirAudit={(id) => setAuditDemandeId(id)}
                                empty="Aucune demande enregistrée." 
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* 2. Dialogue Détail */}
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
                            <Table className="dialog-detail">
                                <TableHeader>
                                    <TableRow className="table-dialog">
                                        <TableHead className="table-dialog-head">IdArticle</TableHead>
                                        <TableHead className="table-dialog-head">Code Lot</TableHead>
                                        <TableHead className="table-dialog-head">Désignation</TableHead>
                                        <TableHead className="table-dialog-head">Code Article</TableHead>
                                        <TableHead className="table-dialog-head">Description</TableHead>
                                        <TableHead className="table-dialog-head">Motif</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(detail.lots ?? []).map((a, i) => (
                                        <TableRow key={a.id || i}>
                                            <TableCell>{String(a.id).padStart(3, '0')}</TableCell>
                                            <TableCell className="font-mono">{a.codeLot || "—"}</TableCell>
                                            <TableCell>{a.designation || "—"}</TableCell>
                                            <TableCell>{a.codeArticle || "—"}</TableCell>
                                            <TableCell>{a.description || "—"}</TableCell>
                                            <TableCell>{detail.motif || "—"}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </DialogContent>
                </Dialog>
                
                {/* 3. Dialogue Aperçu PDF */}
                <Dialog open={openPdf} onOpenChange={setOpenPdf}>
                    <DialogContent className="dialog_demande_content" overlayClassName="fixed inset-0 bg-black/30 backdrop-blur-sm" style={{ maxWidth: '96vw', width: '96vw', maxHeight: '96vh', height: '96vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
                        <DialogHeader style={{ padding: '16px 20px 0' }}>
                            <DialogTitle>
                                <span>Prévisualisation du PDF</span>   
                            </DialogTitle>
                        </DialogHeader>
                        <div style={{ flex: 1, minHeight: 0, padding: '12px 20px 20px' }}>
                            {selectedPdf && (
                                <iframe 
                                    src={selectedPdf} 
                                    style={{ width: '100%', height: '100%', border: 'none', borderRadius: '6px' }}
                                    title="Aperçu PDF"
                                />
                            )}
                        </div>
                    </DialogContent>
                </Dialog>


            </div>
                {/* 4. Dialogue Audit / Suivi (Placé correctement dans le flux principal) */}
                <AuditDialog
                    // demandeId={auditDemandeId}
                    // open={auditDemandeId !== null && auditDemandeId !== undefined}
                    // onClose={() => setAuditDemandeId(null)}
                    demandeId={auditDemandeId}
                    open={Boolean(auditDemandeId)}
                    onClose={() => setAuditDemandeId(null)}
                />
        </main>
    );
}

function DemandesTable({ data, onDetail, onVoirPdf, empty, onVoirAudit }) {
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
                                color: d.status === "Nouvelle" ? "#000927" : d.status === "En attente" ? "#854D0E" : d.status === "Validée" ? "#166534" : "#9F1239",
                                backgroundColor: d.status === "Nouvelle" ? "#a9caf5" : d.status === "En attente" ? "#FEF9C3" : d.status === "En cours" ? "#FEF9C3" : d.status === "Validée" ? "#DCFCE7" : "#FFE4E6",
                                
                            }}>
                                {d.status}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" 
                                        variant="outline" 
                                        className="gap-1" 
                                        onClick={(e) => {
                                            e.stopPropagation(); // Empêche la propagation de l'événemente
                                            e.preventDefault(); // Empêche le comportement par défaut du bouton
                                            onVoirAudit(d.id);
                                        }}
                                    >
                                        <HistoryIcon className="h-4 w-4 text-blue-600" /> Suivi
                                    </Button>
                                    <Button size="sm" variant="outline" className="gap-1 btn_detail" onClick={() => onDetail(d)}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <Eye className="h-4 w-4" /> Détail
                                    </Button>
                                    {(d.status === "Validée" || d.status === "Refusée") && d.pdfFileName && (
                                        <Button size="sm" variant="outline" className="gap-1 btn_detail2" onClick={() => onVoirPdf(d)}>
                                            <Eye className="h-4 w-4 eyehover"  /> Voir fichier
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export default Demandeur;