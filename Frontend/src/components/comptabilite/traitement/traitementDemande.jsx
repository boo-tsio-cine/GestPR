import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { demandeService, frsService, userService, coursChangeService, anomalyService } from "../../../services/api";
import { toast } from "sonner";
import Nav from "../../nav/nav";
import "./traitement.css";
import PageApercuDemande from "./PageApercuDemande";
import paysData from '../../../data/pays.json';

const taux_assurance = 0.2;

function emptyDossierData(){
    return {
        typeDossier: "",
        tc: "",
        unitcours: "",
        cours: "",
        fournisseur: "",
        origine: "",
        port: "",
        usine: "",
        fobTotal: "",
        mfobTotal: "", 
        fretTotal: "", 
        deboursTransit: "",
        deboursMagasinage: "",
        transportLocal: "",
        commissionRemun: "",
        commissionBancaires: "",
        douanes: "",
        prestationGasyNet: "",
        apmf: "",
        ddp: "",
        controleRadioactive: "",
        autresDat: "",
        autreFrais: "",
        desinfecte: "",
        ravinala: "",
        totalHad: "",
        deboursIvato: "",
        compagnie: "",
        tarifLTA: "",
    };
}

function emptyArticleSaisie(){
    return {
        prixUnitaire:"",
        quantite : "",
        immo: "",
        unite: "Kg",
    };
}

// ─────────────────────────────────────────────────────────────────────────
// Fonctions de calcul (pures, réutilisables)
// ─────────────────────────────────────────────────────────────────────────
function calcMontant(prixUnitaire, quantite) {
    const pu = parseFloat(prixUnitaire) || 0;
    const qte = parseFloat(quantite) || 0;
    return pu / qte;
}

function calcProportion(montantArticle, montantTotalDossier){
    if (!montantTotalDossier) return 0;
    return (montantArticle / montantTotalDossier) * 100;
}

function calcPartProrata(montantGlobal, proportion) {
    const total = parseFloat(montantGlobal) || 0;
    return (total * proportion) / 100;
}

function fmt(n, decimals = 4) {
    if (!isFinite(n)) return "0";
    return n.toLocaleString("fr-FR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

function round4(v) {
    return Math.round((parseFloat(v) || 0) * 10000) / 10000;
}

// Calcule toutes les valeurs dérivées pour un article donné
function calculerArticle(lot, dossierData, montantTotalDossier) {
    const montant = calcMontant(lot.prixUnitaire, lot.quantite);
    const proportion = calcProportion(montant, montantTotalDossier);
   
    const partCout = calcPartProrata(dossierData.fobTotal, proportion);
    const partMfob = calcPartProrata(dossierData.mfobTotal, proportion);
    const partFret = calcPartProrata(dossierData.fretTotal, proportion);
   
    const cfr = partCout + partMfob + partFret;
    const assurance = round4((cfr * taux_assurance) / 100);
    const partFraisApproche = calcPartProrata(dossierData.fraisApprocheTotal, proportion);
    const valeurCaf = cfr + assurance;
    const cours = parseFloat(dossierData.cours) || 0;
    const coutTotalAr = valeurCaf * cours + partFraisApproche;
   
    return {
        montant,
        proportion,
        partCout,
        partMfob,
        partFret,
        cfr,
        assurance,
        partFraisApproche,
        valeurCaf,
        coutTotalAr,
    };
}

export function TraitementDemande(){
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [demandeId, setDemandeId] = useState(id);
    const [demandes, setDemandes] = useState(null);
    const [commentaire, setCommentaire] = useState("");

    const [categories, setCategories] = useState([]);

    // données globales du dossier
    const [dossierData, setDossierData] = useState(emptyDossierData());

    // Saisie par article
    const [saisies, setSaisies] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [afficherApercu, setAfficherApercu] = useState(false);
    const [idDemandeGenere, setIdDemandeGenere] = useState(null);
    const [error, setError] = useState(null); 
    const [frs, setFrs] = useState([]);   
    const [loadingCours, setLoadingCours] = useState(false);

    // Résultat de la vérification d'anomalie par ligne d'article (clé = rowKey)
    const [alertesAnomalies, setAlertesAnomalies] = useState({});
    const [loadingAnomalie, setLoadingAnomalie] = useState({});

    const [designationSelectionnee, setDesignationSelectionnee] = useState(null);
    const [historiqueArticles, setHistoriqueArticles] = useState([]);
    const [loadingHist, setLoadingHist] = useState(false);

    const fetchDemandes = async () => {
        setLoading(true);
        try {
            const [res, utilisateursRes] = await Promise.all([
                demandeService.getDemande(id),
                userService.getAll(),
            ]);
            // GetById (backend) enveloppe la réponse dans ApiResponse { success, message, data },
            // contrairement à GetAllAsync qui renvoie l'objet brut. On dépile donc "data" si présent.
            const d = res.data?.data ?? res.data;

            if(!d) throw new Error("Aucune donnée reçue");

            const listeUtilisateurs = utilisateursRes.data || [];
            const demandeurId = d.demandeurId ?? d.DemandeurId;
            const utilisateurTrouve = listeUtilisateurs.find(
                (u) => (u.id ?? u.Id) === demandeurId
            );
    
            const demandesFormatees = {
                id: d.id ?? d.Id,
                motif: d.motif ?? d.Motif ?? "",
                status: d.status ?? d.Status ?? "Nouvelle",
                date: d.dateTime ?? d.DateTime,
                site: utilisateurTrouve ? (utilisateurTrouve.site || utilisateurTrouve.Site || "") : "",
                demandeurId: demandeurId,
                nomDemandeur: utilisateurTrouve
                    ? (utilisateurTrouve.nom || utilisateurTrouve.Nom || utilisateurTrouve.username)
                    : `Utilisateur N°${demandeurId}`,
                prenomDemandeur: utilisateurTrouve
                    ? (utilisateurTrouve.prenom || utilisateurTrouve.Prenom || utilisateurTrouve.lastname)
                    : `Utilisateur N°${demandeurId}`,
                matricule: utilisateurTrouve
                    ? (utilisateurTrouve.matricule || utilisateurTrouve.Matricule)
                    : `Utilisateur N°${demandeurId}`,
                lots: (d.articles ?? d.Articles ?? []).map((a) => ({
                    id: a.id ?? a.Id ?? 0,  
                    codeLot: a.codeLot ?? a.CodeLot ?? "",
                    designation: a.designation ?? a.Designation ?? ""
                })),
            };
            setDemandes(demandesFormatees);

            const initial = {};
            demandesFormatees.lots.forEach((lot) => {
                initial[lot.id] = emptyArticleSaisie();
            });
            setSaisies(initial);
            
        } catch (err) {
            console.error("Erreur fetchDemandes:", err.response?.data || err.message);
            toast.error("Impossible de charger cette demande");
            setDemandes(null);
        } finally {
            setLoading(false);
        }
    }
    
    useEffect(() => {
        if(id){
            fetchDemandes();
        }
    }, [id]);

    const updateDossierField = (field, value) => {
        setDossierData((prev) => ({
            ...prev, [field]: value
        }));
    };

    // Récupère le dernier cours mis en cache Redis pour la devise sélectionnée,
    // et pré-remplit le champ (l'utilisateur peut toujours le corriger manuellement).
    const fetchDernierCours = async (devise) => {
        if (!devise) return;
        setLoadingCours(true);
        try {
            const res = await coursChangeService.getDernierCours(devise);
            const cours = res?.data?.data?.cours ?? res?.data?.cours;
            if (cours != null) {
                setDossierData((prev) => ({ ...prev, cours: cours.toString() }));
                toast.info(`Cours ${devise} pré-rempli (dernier saisi)`);
            }
        } catch (err) {
            // Pas grave si ça échoue : l'utilisateur saisit simplement à la main
            console.warn("Impossible de récupérer le cours en cache :", err.message);
        } finally {
            setLoadingCours(false);
        }
    };

    useEffect(() => {
        if (dossierData.unitcours) {
            fetchDernierCours(dossierData.unitcours);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dossierData.unitcours]);

    const updateSaisieArticle = (articleId, field, value) => {
        setSaisies((prev) => ({
            ...prev, [articleId]: { ...prev[articleId], [field]: value },
        }));
    };

    const voirHistorique = async (designation) => {
        setDesignationSelectionnee(designation);
        setLoadingHist(true);
        try {
            const response = await demandeService.getHistoriqueByDesignation(designation);
            setHistoriqueArticles(response.data);
        } catch (err) {
            toast.error("Impossible de charger l'historique de cet article");
        } finally {
            setLoadingHist(false);
        }
    };

    // Vérifie si le prix calculé pour cette ligne semble anormal par rapport à l'historique
    const verifierAnomalie = async (rowKey, designation, codeLot, prixDeRevient) => {
        if (!prixDeRevient || prixDeRevient <= 0) {
            toast.error("Renseignez d'abord la quantité et le prix unitaire de cette ligne.");
            return;
        }
        setLoadingAnomalie((prev) => ({ ...prev, [rowKey]: true }));
        try {
            const response = await anomalyService.analyserPrix(designation, codeLot, prixDeRevient);
            setAlertesAnomalies((prev) => ({ ...prev, [rowKey]: response.data.data }));
        } catch (err) {
            toast.error("Impossible de vérifier ce prix pour le moment.");
        } finally {
            setLoadingAnomalie((prev) => ({ ...prev, [rowKey]: false }));
        }
    };

    const valeurCAF = useMemo(() => {
        const fob = parseFloat(dossierData.fobTotal) || 0;
        const mfob = parseFloat(dossierData.mfobTotal) || 0;
        const fret = parseFloat(dossierData.fretTotal) || 0;
        const assurance = ((fob + mfob + fret) * taux_assurance) / 100;
        const valcaf = fob + mfob + fret + assurance;
        return round4(valcaf * (parseFloat(dossierData.cours) || 0));
    }, [dossierData.fobTotal, dossierData.mfobTotal, dossierData.fretTotal, dossierData.cours]);

    useEffect(() => {
        if (valeurCAF) {
            updateDossierField("commissionBancaires", round4(valeurCAF * 0.15));
        }
    }, [valeurCAF]);

    useEffect(() => {
        if (dossierData.typeDossier === "Aériens" && dossierData.compagnie) {
            const tarif = dossierData.compagnie === "14MA" ? 13 * (parseFloat(dossierData.cours) || 0) : 30000;
            updateDossierField("tarifLTA", round4(tarif));
        }
    }, [dossierData.typeDossier, dossierData.compagnie, dossierData.cours]);

    useEffect(() => {
        if (dossierData.typeDossier === "Aériens" && (dossierData.desinfecte || dossierData.ravinala)) {
            const deboursIvato = (parseFloat(dossierData.desinfecte) || 0) + (parseFloat(dossierData.ravinala) || 0) + (parseFloat(dossierData.tarifLTA) || 0);
            updateDossierField("deboursIvato", round4(deboursIvato));
        }
    }, [dossierData.typeDossier, dossierData.desinfecte, dossierData.ravinala, dossierData.tarifLTA]);

    const detailFraisApproche = useMemo(() => {
        const tc = parseFloat(dossierData.tc) || 0;
        const clesFrais = ["deboursMagasinage", "commissionBancaires", "prestationGasyNet", "apmf","ddp", "controleRadioactive", "autresDat", "autreFrais"];
        
        const deboursTransitTranslate = parseFloat(dossierData.deboursTransit * dossierData.cours) || 0;
        const commissionRemunTranslate = parseFloat(dossierData.commissionRemun * valeurCAF / 100) || 0;
        const commissionBancairesTranslate = parseFloat(dossierData.commissionBancaires) || 0;
        const douanesTranslate = parseFloat(dossierData.douanes * valeurCAF / 100) || 0;
        const prestationGasyNetTranslate = parseFloat(dossierData.prestationGasyNet) || 0;
        const transportLocalTranslate = parseFloat(dossierData.transportLocal) || 0;
        const transportLocalTotal = transportLocalTranslate * tc;
        const maritimeFret = parseFloat(dossierData.fretTotal * dossierData.cours) || 0;
        const maritimeMfob = parseFloat(dossierData.mfobTotal * dossierData.cours) || 0;
        const totalAutresFrais = clesFrais.reduce((total, cle) => {
            const valeur = parseFloat(dossierData[cle]) || 0;
            return total + valeur;
        }, 0) + transportLocalTotal;

        const pourcentdeboursTransit = valeurCAF ? parseFloat(dossierData.deboursTransit * dossierData.cours * (parseFloat(dossierData.tc) || 0) / valeurCAF * 100) : 0;
        const pourcentTransport = valeurCAF ? parseFloat(transportLocalTranslate / valeurCAF * 100) : 0;
        const pourcentcommissionRemun = valeurCAF ? parseFloat(commissionRemunTranslate / valeurCAF * 100) : 0;
        const pourcentcommissionBancaire = valeurCAF ? parseFloat(dossierData.commissionBancaires / valeurCAF * 100) : 0;
        const pourcentdouanes = valeurCAF ? parseFloat(douanesTranslate / valeurCAF * 100) : 0;
        const pourcentprestationGasyNet = valeurCAF ? parseFloat(prestationGasyNetTranslate / valeurCAF * 100) : 0;
        
        const total = (parseFloat(dossierData.mfobTotal*dossierData.cours) || 0) + (parseFloat(dossierData.fretTotal*dossierData.cours) || 0) +dossierData.commissionBancaires/100 +  (parseFloat(dossierData.deboursTransit*dossierData.cours) || 0) +  (parseFloat(dossierData.transportLocal*dossierData.tc) || 0) + (parseFloat(dossierData.commissionRemun * valeurCAF /100) || 0) + (parseFloat(dossierData.douanes * valeurCAF /100) || 0) +  (parseFloat(dossierData.prestationGasyNet) || 0) +  (parseFloat(dossierData.apmf) || 0) +  (parseFloat(dossierData.ddp) || 0) +  (parseFloat(dossierData.controleRadioactive) || 0) +  (parseFloat(dossierData.autresDat) || 0) + (parseFloat(dossierData.tarifLTA) || 0) + (parseFloat(dossierData.autreFrais) || 0) + (parseFloat(dossierData.totalHad) || 0) + (parseFloat(dossierData.deboursIvato) || 0);

        return {
            deboursTransitTranslate,
            commissionRemunTranslate,
            commissionBancairesTranslate,
            douanesTranslate,
            prestationGasyNetTranslate,
            transportLocalTranslate,
            maritimeFret,
            maritimeMfob,
            totalAutresFrais,
            total,
            pourcentdeboursTransit,
            pourcentTransport,
            pourcentcommissionRemun,
            pourcentcommissionBancaire,
            pourcentdouanes,
            pourcentprestationGasyNet,
        };
    }, [dossierData, valeurCAF]);

    const fraisApprocheTotalCalcule = detailFraisApproche.total;

    const isCanettes = dossierData.typeDossier === "Canettes";

    const lignes = useMemo(() => {
        if (!demandes) return [];
        if (isCanettes) {
            return demandes.lots.flatMap((lot) => [
                { rowKey: `${lot.id}#0`, lot, label: "Couvercle" },
                { rowKey: `${lot.id}#1`, lot, label: "Boîte" },
            ]);
        }
        return demandes.lots.map((lot) => ({ rowKey: lot.id, lot, label: "" }));
    }, [demandes, isCanettes]);
  
    const montantTotalDossier = useMemo(() => {
        return lignes.reduce((total, { rowKey }) => {
            const s = saisies[rowKey] || emptyArticleSaisie();
            return total + calcMontant(s.prixUnitaire, s.quantite);
        }, 0);
    }, [lignes, saisies]);

    const total = useMemo(() => {
        const mfob = parseFloat(dossierData.mfobTotal) || 0;
        const fret = parseFloat(dossierData.fretTotal) || 0;
        return round4(valeurCAF + fraisApprocheTotalCalcule - ((mfob + fret) * (parseFloat(dossierData.cours) || 0)));
    }, [valeurCAF, fraisApprocheTotalCalcule, dossierData.mfobTotal, dossierData.fretTotal, dossierData.cours]);

    const resultatsParArticle = useMemo(() => {
        if (!demandes) return {};
        const resultats = {};

        const totalPuSaisi = lignes.reduce((sum, { rowKey }) => {
            const saisie = saisies[rowKey] || emptyArticleSaisie();
            return sum + (parseFloat(saisie.prixUnitaire) || 0);
        }, 0);

        lignes.forEach(({ rowKey, lot }) => {
            const saisie = saisies[rowKey] || emptyArticleSaisie();
            
            const base = calculerArticle(
                { ...lot, prixUnitaire: saisie.prixUnitaire, quantite: saisie.quantite },
                { ...dossierData, fraisApprocheTotal: fraisApprocheTotalCalcule },
                montantTotalDossier
            );

            const puSaisi = parseFloat(saisie.prixUnitaire) || 0;
            const qteSaisie = parseFloat(saisie.quantite) || 0;
        
            const puAriaryCalcule = (totalPuSaisi > 0 && qteSaisie > 0) ? (puSaisi * total) / (totalPuSaisi * qteSaisie) : 0;

            resultats[rowKey] = {
                ...base,
                puAriary: puAriaryCalcule,
            };
        });
        return resultats;
    }, [demandes, lignes, saisies, dossierData, montantTotalDossier, total, fraisApprocheTotalCalcule]);
 
    const totaux = useMemo(() => {
        const valeurs = Object.values(resultatsParArticle);
        const totalPu = lignes.reduce((s, { rowKey }) => {
            const pu = parseFloat(saisies[rowKey]?.prixUnitaire) || 0;
            return s + pu;
        }, 0);

        return {
            totalPu,
            montant: valeurs.reduce((s, v) => s + v.montant, 0),
            cfr: valeurs.reduce((s, v) => s + v.cfr, 0),
            assurance: valeurs.reduce((s, v) => s + v.assurance, 0),
            coutTotalAr: valeurs.reduce((s, v) => s + v.coutTotalAr, 0),
        };
    }, [resultatsParArticle, lignes, saisies]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const lignesIncompletes = lignes.filter(({ rowKey }) => {
            const s = saisies[rowKey];
            return !s?.prixUnitaire || !s?.quantite;
        });

        if (lignesIncompletes.length > 0) {
            toast.error("Veuillez remplir le prix unitaire et la quantité pour chaque article");
            return;
        }

        setIdDemandeGenere(id);
        setAfficherApercu(true);
    };

    const fetchFrs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await frsService.getAll();
            setFrs(response.data);
        } catch(err) {
            setError(err.message || "Erreur de chargement")
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchFrs();
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER CONDITIONNEL RESTRUCTURÉ (Correction de l'écran blanc)
    // ─────────────────────────────────────────────────────────────────────────
    
    // 1️⃣ PRIORITÉ : Afficher l'aperçu si activé
    if (afficherApercu) {
        const articlesFormates = lignes.map(({ rowKey, lot }) => ({
            id: rowKey,
            designation: lot.designation,
            codeLot: lot.codeLot,
            prixUnitaire: saisies[rowKey]?.prixUnitaire || 0,
            quantite: saisies[rowKey]?.quantite || 0,
            immo: saisies[rowKey]?.immo || "",
            unite: saisies[rowKey]?.unite || "Kg",
            partFraisApproche: resultatsParArticle[rowKey]?.partFraisApproche || 0,
            puAriary: resultatsParArticle[rowKey]?.puAriary || 0
        }));

        return (
            <PageApercuDemande 
                idDemande={idDemandeGenere} 
                userRole="Demandeur" 
                onRetour={() => setAfficherApercu(false)} 
                donneesInitiales={{
                    dossierData: {
                        ...dossierData,
                        fraisApprocheTotal: fraisApprocheTotalCalcule 
                    },
                    detailFraisApproche,
                    total,
                    valeurCAF,
                    fraisApprocheTotalCalcule,
                    articles: articlesFormates,
                    statut: demandes.status,
                    site: demandes.site,
                    nomDemandeur: demandes.nomDemandeur,
                    prenomDemandeur: demandes.prenomDemandeur,
                    matricule: demandes.matricule,
                    commentaire: commentaire,
                    tauxAssurance: taux_assurance,
                }}
            />
        );
    }

    // 2️⃣ Gérer l'état de chargement
    if (loading) {
        return (
            <>
                <Nav />
                <div className="container" style={{ marginTop: "10rem" }}>
                    Chargement de la demande...
                </div>
            </>
        );
    }
    
    // 3️⃣ Gérer l'absence de demande (Cas d'erreur)
    if (!demandes) {
        return (
            <>
                <Nav />
                <div className="container text-danger" style={{ marginTop: "10rem" }}>
                    Demande introuvable.
                </div>
            </>
        );
    }

    // 4️⃣ Rendu principal (Formulaire)
    return (
        <>
            <Nav/>
            <div className="traitement" >
                <div className="traitement-head">
                     <button onClick={() => navigate("/home@comptabilite")}>
                        ⬅️ 
                    </button>
                    <div>
                        
                        <h4 className="traiter-title mb-0">Traitement de Demande <span style={{
                            backgroundColor: demandes.status === "Nouvelle" ? "#a9caf5" : demandes.status === "En attente" ? "#FEF9C3" : demandes.status === "Validée" ? "#DCFCE7" : "#FFE4E6",
                            color: demandes.status === "Nouvelle" ? "#000927" : demandes.status === "En attente" ? "#854D0E" : demandes.status === "Validée" ? "#166534" : "#9F1239",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "0.75rem"
                        }}>{demandes.status}</span></h4>
                         <p> DEM - {String(id).padStart(3, '0')}  |   {demandes.date ? new Date(demandes.date).toLocaleDateString('fr-FR') : "Inconnue"}</p>

                    
                    </div>
                    <div className="head-infos">
                        <span><strong>Nom :</strong> {demandes.nomDemandeur} {demandes.prenomDemandeur}</span>
                        <span><strong>Site :</strong> {demandes.site || "Non défini"}</span>
                        <span><strong>Matricule :</strong> {demandes.matricule}</span>
                    </div>
               
                </div>
                <div className="traiter-page">
                    <form onSubmit={handleSubmit} method="post">
                        <div className="row-bottom">
                            <div className="left-column">
                                <div className="info-config">
                                    <div className="info-title">
                                        Configuration
                                    </div>
                                    <div className="row">

                                    <div className="">
                                        <label className="form-label">Type de demande</label>
                                        <br></br>
                                        <select name="typeDossier" className="" value={dossierData.typeDossier} onChange={(e) => updateDossierField("typeDossier", e.target.value)}>
                                            <option value="">Sélectionner le type</option>
                                             <option value="Aériens">Aériens</option>
                                             <option value="Canettes">Canettes</option>
                                             <option value="Full">Full</option>
                                             <option value="Groupage">Groupage</option>
                                             <option value="Malte">Malte</option>
                                             <option value="Sucre">Sucre</option>
                                         </select>
                                    </div>
                                     {dossierData.typeDossier === "Aériens" ? (
                                         <div className="">
                                             <label className="form-label">Compagnie <small className="text-muted fw-normal"></small></label>
                                             <select className="" value={dossierData.compagnie} onChange={(e) => updateDossierField("compagnie", e.target.value)}>
                                                 <option value="">Sélectionner</option>
                                                 <option value="12IV">12IV</option>
                                                 <option value="14MA">14MA</option>
                                             </select>
                                         </div>
                                     ) : (
                                         <div className="">
                                             <label className="form-label">Nombre TC</label>
                                             <br></br>
                                             <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                value={dossierData.tc}
                                                onChange={(e) => updateDossierField("tc", e.target.value)}
                                                required
                                                />
                                        </div>
                                     )}
                                     <div className="">
                                         <label className="form-label">Origine</label>
                                         <br></br>
                                         <select name="origine" className="form-control" value={dossierData.origine || ""} onChange={(e) => updateDossierField("origine", e.target.value)}>
                                             <option value="">Sélectionner l'origine</option>
                                             {paysData.map((pays) => (
                                                 <option key={pays.code} value={pays.nom}>
                                                     {pays.drapeau} {pays.nom}
                                                 </option>
                                             ))}
                                         </select>
                                     </div>
                                      <div className="">
                                         <label className="form-label">Fournisseur</label>
                                         <br></br>
                                         <select name="frs" className="form-control" value={dossierData.frs || ""} onChange={(e) => updateDossierField("frs", e.target.value)} disabled={loading}>
                                             <option value="">
                                                 {loading ? "Chargement des fournisseurs..." : "Sélectionner le fournisseur"}
                                             </option>
                                             {!loading && frs && frs.map((f) => (
                                                 <option key={f.id || f.Id} value={f.nom_frs || f.Nom_frs || f}>
                                                     {f.nom_frs || f.Nom_frs || f}
                                                 </option>
                                             ))}
                                         </select>
                                     </div>
                                     {dossierData.typeDossier !== "Aériens" && (
                                     <div className="">
                                             <label className="form-label">Port</label>
                                             <br></br>
                                             <select name="port" className="form-control" value={dossierData.port} onChange={(e) => updateDossierField("port", e.target.value)}>
                                                 <option value="">Sélectionner le port</option>
                                                 <option value="Diégo">Diégo</option>
                                                 <option value="Tamatave">Tamatave</option>
                                             </select>
                                         </div>
                                     )}
                                    <div className="">
                                         <label className="form-label">Usine</label>
                                         <br></br>
                                         <select name="usine" className="form-control" value={dossierData.usine} onChange={(e) => updateDossierField("usine", e.target.value)}>
                                             <option value="">Sélectionner l'usine</option>
                                             <option value="Ambatolampy">Ambatolampy</option>
                                             <option value="Antsirabe">Antsirabe</option>
                                             <option value="Diégo">Diégo</option>
                                             <option value="MALTO">MALTO</option>
                                             <option value="SEMA">SEMA</option>
                                             <option value="Siège">Siège</option>
                                         </select>
                                     </div>
                                     </div>
                                </div>

                                <div className="traiter-block">
                                    <h4>Données générales du dossier</h4>
                                    <div>
                                        <div>
                                            <label>Devise</label><br/>
                                            <select name="unitcours" value={dossierData.unitcours} onChange={(e) => updateDossierField("unitcours", e.target.value)}>
                                                <option value="">Sélectionner cours</option>
                                                <option value="Dollar">Dollar</option>
                                                <option value="Euro">Euro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label>
                                                Cours de change
                                                {loadingCours && <span>⏳</span>}
                                            </label><br/>
                                            <input type="number" step="0.01" value={dossierData.cours} onChange={(e) => updateDossierField("cours", e.target.value)} disabled={loadingCours} required />
                                        </div>
                                        <div>
                                            <label>Montant FOB</label><br/>
                                            <input type="number" step="0.01" value={dossierData.fobTotal} onChange={(e) => updateDossierField("fobTotal", e.target.value)} required />
                                        </div>
                                        <div>
                                            <label>Mise à FOB</label><br/>
                                            <input type="number" step="0.01" value={dossierData.mfobTotal} onChange={(e) => updateDossierField("mfobTotal", e.target.value)} required />
                                        </div>
                                        <div>
                                            <label>Fret</label><br/>
                                            <input type="number" step="0.01" value={dossierData.fretTotal} onChange={(e) => updateDossierField("fretTotal", e.target.value)} required />
                                        </div>
                                        {dossierData.typeDossier === "Aériens" && (
                                            <div>
                                                <label>Autre Frais <small>(Ar)</small></label><br/>
                                                <input type="number" step="0.01" value={dossierData.autreFrais} onChange={(e) => updateDossierField("autreFrais", e.target.value)} />
                                            </div>
                                        )}
                                        <div>
                                            <label>Valeur CAF totale (Ar)</label><br/>
                                            <input type="number" step="0.01" value={valeurCAF} readOnly />
                                        </div>
                                        <div>
                                            <label>Frais d'approche totaux (Ar)</label><br/>
                                            <input type="number" step="0.01" value={fraisApprocheTotalCalcule} readOnly />
                                        </div>
                                        <div>
                                            <label>Total général (Ar)</label><br/>
                                            <input type="number" step="0.01" value={total} readOnly />
                                        </div>
                                    </div>
                                </div>

                                <div className="traiter-block">
                                    <h4>Détail des frais d'approche</h4>
                                    <div>
                                        {dossierData.typeDossier !== "Aériens" && (
                                            <div>
                                                <label>Frais à l'arrivée <small>(devise)</small></label><br/>
                                                <input type="number" step="0.01" value={dossierData.deboursTransit} onChange={(e) => updateDossierField("deboursTransit", e.target.value)} />
                                            </div>
                                        )}
                                        {dossierData.typeDossier !== "Aériens" && (
                                            <div>
                                                <label>Débours Magasinage <small>(Ar)</small></label><br/>
                                                <input type="number" step="0.01" value={dossierData.deboursMagasinage} onChange={(e) => updateDossierField("deboursMagasinage", e.target.value)} />
                                            </div>
                                        )}
                                        {dossierData.typeDossier !== "Aériens" && (
                                            <div>
                                                <label>Transport Local <small>(Ar)</small></label><br/>
                                                <input type="number" step="0.01" value={dossierData.transportLocal} onChange={(e) => updateDossierField("transportLocal", e.target.value)} />
                                            </div>
                                        )}
                                        <div>
                                            <label>Commission SACOFRINA <small>(%)</small> </label><br/>
                                            <input type="number" step="0.01" value={dossierData.commissionRemun} onChange={(e) => updateDossierField("commissionRemun", e.target.value)} />
                                        </div>
                                        <div>
                                            <label>Commission Bancaires <small>(Ar)</small></label><br/>
                                            <input type="number" step="0.01" value={round4(dossierData.commissionBancaires / 100)} readOnly />
                                        </div>
                                        <div>
                                            <label>Douanes <small>(%)</small></label><br/>
                                            <input type="number" step="0.01" value={dossierData.douanes} onChange={(e) => updateDossierField("douanes", e.target.value)} />
                                        </div>
                                        <div>
                                            <label>Prestation GasyNet <small>(Ar)</small></label><br/>
                                            <input type="number" step="0.01" value={dossierData.prestationGasyNet} onChange={(e) => updateDossierField("prestationGasyNet", e.target.value)} />
                                        </div>
                                        {dossierData.typeDossier !== "Aériens" && (
                                            <div>
                                                <label>APMF <small>(Ar)</small></label><br/>
                                                <input type="number" step="0.01" value={dossierData.apmf} onChange={(e) => updateDossierField("apmf", e.target.value)} />
                                            </div>
                                        )}
                                        {dossierData.typeDossier !== "Aériens" && (
                                            <div>
                                                <label>DDP <small>(Ar)</small></label><br/>
                                                <input type="number" step="0.01" value={dossierData.ddp} onChange={(e) => updateDossierField("ddp", e.target.value)} />
                                            </div>
                                        )}
                                        {dossierData.typeDossier !== "Aériens" && (
                                            <div>
                                                <label>Contrôle Radioactive <small>(Ar)</small></label><br/>
                                                <input type="number" step="0.01" value={dossierData.controleRadioactive} onChange={(e) => updateDossierField("controleRadioactive", e.target.value)} />
                                            </div>
                                        )}
                                        <div>
                                            <label>{dossierData.typeDossier === "Aériens" ? "Autre taxe" : "Autres DAT"} <small>(Ar)</small></label><br/>
                                            <input type="number" step="0.01" value={dossierData.autresDat} onChange={(e) => updateDossierField("autresDat", e.target.value)} />
                                        </div>

                                        {dossierData.typeDossier === "Aériens" && (
                                            <>
                                                <div>
                                                    <label>Desinfecte <small>(Ar)</small></label><br/>
                                                    <input type="number" step="0.01" value={dossierData.desinfecte} onChange={(e) => updateDossierField("desinfecte", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label>Ravinala <small>(Ar)</small></label><br/>
                                                    <input type="number" step="0.01" value={dossierData.ravinala} onChange={(e) => updateDossierField("ravinala", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label>Total Had <small>(Ar)</small></label><br/>
                                                    <input type="number" step="0.01" value={dossierData.totalHad} onChange={(e) => updateDossierField("totalHad", e.target.value)} />
                                                </div>
                                                <div>
                                                    <label>Débours Ivato <small>(Ar)</small></label><br/>
                                                    <input type="number" step="0.01" value={dossierData.deboursIvato} readOnly />
                                                </div>
                                                <div>
                                                    <label>Tarif LTA <small>(Ar)</small></label><br/>
                                                    <input type="number" step="0.01" value={dossierData.tarifLTA} readOnly />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="info-table">
                                <div className="table-responsive">
                                    <table className="table table-bordered table-sm align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Désignation</th>
                                                <th>Code IMMO</th>
                                                <th>Montant (devise)<br/><small className="text-muted">saisi</small></th>
                                                <th >Quantité<br/><small className="text-muted">saisi</small></th>
                                                <th>PU (devise)</th>
                                                <th>PU en Ariary</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lignes.map(({ rowKey, lot, label }) => {
                                                const saisie = saisies[rowKey] || emptyArticleSaisie();
                                                const r = resultatsParArticle[rowKey] || {};
                                                return (
                                                    <tr key={rowKey}>
                                                        <td>
                                                            <strong>{lot.codeLot}</strong>
                                                            {label && <span className="badge bg-info text-dark ms-1">{label}</span>}
                                                            <br />
                                                            <small className="text-muted">{lot.designation}</small>
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-sm btn-link text-primary p-0 ms-2"
                                                                onClick={() => voirHistorique(lot.designation)}
                                                                title="Voir l'historique de cette désignation"
                                                            >
                                                                 Historique
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                className="btn btn-sm btn-link text-warning p-0 ms-2"
                                                                onClick={() => verifierAnomalie(rowKey, lot.designation, lot.codeLot, r.puAriary)}
                                                                disabled={loadingAnomalie[rowKey] || !r.puAriary || r.puAriary <= 0}
                                                                title={!r.puAriary || r.puAriary <= 0 ? "Renseignez d'abord la quantité et le prix unitaire" : "Vérifier si ce prix semble anormal"}
                                                            >
                                                                 {loadingAnomalie[rowKey] ? "Vérification..." : "Vérifier le prix"}
                                                            </button>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="form-control form-control-sm"
                                                                value={saisie.immo}
                                                                onChange={(e) => updateSaisieArticle(rowKey, "immo", e.target.value)}
                                                                placeholder="Code IMMO"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                className="form-control form-control-sm"
                                                                value={saisie.prixUnitaire}
                                                                onChange={(e) => updateSaisieArticle(rowKey, "prixUnitaire", e.target.value)}
                                                                required
                                                            />
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className="form-control form-control-sm"
                                                                    value={saisie.quantite}
                                                                    onChange={(e) => updateSaisieArticle(rowKey, "quantite", e.target.value)}
                                                                    required
                                                                />
                                                                <select
                                                                    className="form-select form-select-sm"
                                                                    style={{ width: "70px" }}
                                                                    value={saisie.unite}
                                                                    onChange={(e) => updateSaisieArticle(rowKey, "unite", e.target.value)}
                                                                >
                                                                    <option value="EA">EA</option>
                                                                    <option value="HL">HL</option>
                                                                    <option value="Kg">Kg</option>
                                                                    <option value="LTS">LTS</option>
                                                                    <option value="T">T</option>
                                                                    <option value="U">U</option>
                                                                </select>
                                                            </div>
                                                        </td>
                                                        <td className="text-end">{fmt(r.montant)}</td>
                                                        <td className="text-end">
                                                            <strong>{fmt(r.puAriary)} Ar</strong>
                                                            {alertesAnomalies[rowKey] && (
                                                                <div className="mt-1">
                                                                    {alertesAnomalies[rowKey].nbOccurrencesHistorique === 0 ? (
                                                                        <span className="badge bg-secondary" title={alertesAnomalies[rowKey].message}>
                                                                            Pas d'historique
                                                                        </span>
                                                                    ) : alertesAnomalies[rowKey].alerteEcartRecent ? (
                                                                        <span className="badge bg-danger" title={alertesAnomalies[rowKey].message}>
                                                                            ⚠️ {alertesAnomalies[rowKey].ecartVsDernierPrixPourcent > 0 ? "+" : ""}
                                                                            {alertesAnomalies[rowKey].ecartVsDernierPrixPourcent}% vs dernier prix
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-success" title={alertesAnomalies[rowKey].message}>
                                                                            ✓ {alertesAnomalies[rowKey].ecartVsDernierPrixPourcent > 0 ? "+" : ""}
                                                                            {alertesAnomalies[rowKey].ecartVsDernierPrixPourcent}% vs dernier prix
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="table-light">
                                                <td><strong>Totaux</strong></td>
                                                <td></td>
                                                <td className="text-end"><strong>{fmt(totaux.totalPu)}</strong></td>
                                                <td></td>
                                                <td></td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                    <div className="col-12 mt-3">
                                        <label className="form-label text-muted">Commentaire :</label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            placeholder="Saisissez un commentaire concernant le traitement de cette demande..."
                                            value={commentaire}
                                            onChange={(e) => setCommentaire(e.target.value)}
                                            maxLength={1000}
                                        ></textarea>
                                    </div>
                                    {demandes.status === "Nouvelle" && (
                                        <div className="mt-3 text-end">
                                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                                {submitting ? "Enregistrement..." : "Enregistrer le traitement"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>               

                        
                
                        
                    </form>
                </div>
            </div>
            
            {designationSelectionnee && (
                <div className="modal-overlay" onClick={() => setDesignationSelectionnee(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h5>Historique : {designationSelectionnee}</h5>
                            <button className="btn btn-sm btn-close" onClick={() => setDesignationSelectionnee(null)}></button>
                        </div>
                        <div className="modal-body">
                            {loadingHist ? (
                                <div className="text-center">Chargement de l'historique...</div>
                            ) : historiqueArticles.length === 0 ? (
                                <div className="text-center text-muted">Aucun historique disponible pour cette désignation.</div>
                            ) : (
                                <table className="table table-bordered table-striped table-sm align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Date</th>
                                            <th>N° Demande</th>
                                            <th>Code Lot</th>
                                            <th>Statut Demande</th>
                                            <th className="text-end">Prix de Revient</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historiqueArticles.map((art, idx) => (
                                            <tr key={art.demandeId || idx}>
                                                <td>{art.date ? new Date(art.date).toLocaleDateString('fr-FR') : "N/A"}</td>
                                                <td>N° {String(art.demandeId).padStart(3, '0')}</td>
                                                <td><span className="badge bg-secondary">{art.codeLot}</span></td>
                                                <td>
                                                    <span style={{
                                                        color: art.status === "Nouvelle" ? "#000927" : art.status === "En attente" ? "#854D0E" : art.status === "Validée" ? "#166534" : art.status === "En cours" ? "#856404" : "#9F1239",
                                                        backgroundColor: art.status === "Nouvelle" ? "#a9caf5" : art.status === "En attente" ? "#FEF9C3" : art.status === "Validée" ? "#DCFCE7" : art.status === "En cours" ? "#fff3cd" : "#FFE4E6",
                                                        padding: "4px 10px",
                                                        borderRadius: "9999px",
                                                        fontSize: "12px",
                                                        fontWeight: 500,
                                                        display: "inline-block"
                                                    }}>
                                                        {art.status}
                                                    </span>
                                                </td>
                                                <td className="text-end text-success">
                                                    <strong>{fmt(art.prixDeRevient || 0)} Ar</strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}