import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom"
import { demandeService, frsService, userService } from "../../../services/api";
import { toast } from "sonner";
import Nav from "../../nav/nav";
import "./traitement.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PageApercuDemande from "./PageApercuDemande";
import paysData from '../../../data/pays.json';

const taux_assurance = 0.2 ;

function emptyDossierData(){
    return{
        typeDossier: "" ,
        tc : "",
        cours: "" ,
        fournisseur: "",
        origine:"",
        port:"",
        usine:"",
        fobTotal : "" ,
        mfobTotal: "", 
        fretTotal : "" , 
        
        deboursTransit : "",
        deboursMagasinage : "",
        transportLocal : "",
        commissionRemun : "",
        commissionBancaires : "",
        douanes : "",
        prestationGasyNet : "",
        apmf: "",
        ddp:"",
        controleRadioactive: "",
        autresDat: "",
    };
}

function emptyArticleSaisie(){
    return {
        prixUnitaire:"",
        quantite : "",
        immo: "",
    };
}




// ─────────────────────────────────────────────────────────────────────────
// Fonctions de calcul (pures, réutilisables)
// ──

// Montant de l'article = PU * Qtt
function calcMontant(prixUnitaire, quantite) {
    const pu = parseFloat(prixUnitaire) || 0;
    const qte = parseFloat(quantite) || 0;
    return pu / qte;
}



// Total des montants de tous les articles du dossier
function calcMontantTotalDossier(lots) {
    return lots.reduce(
        (total, lot) => total + calcMontant(lot.prixUnitaire, lot.quantite), 0
    );
}

 
// Proportion de l'article dans le dossier (en %)
function calcProportion(montantArticle, montantTotalDossier){
    if (!montantTotalDossier) return 0;
    return (montantArticle / montantTotalDossier) * 100;
}

// Répartition au prorata d'un montant global du dossier
function calcPartProrata(montantGlobal, proportion) {
  const total = parseFloat(montantGlobal) || 0;
  return (total * proportion) / 100;
}
 

 
// ─────────────────────────────────────────────────────────────────────────
// Formatage d'affichage
// ─────────────────────────────────────────────────────────────────────────
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
 


export function TraitementDemande(){
    const {id} = useParams();
    const [loading, setLoading] = useState(true);
    const [demandeId, setDemandeId] = useState(id);
    const [demandes, setDemandes] = useState(null);
    const [commentaire, setCommentaire] = useState("");

    // données globales du dossier (saisies une seule fois)
    const [dossierData, setDossierData] = useState(emptyDossierData());

    // Saisie par article : {  [articleId]: { prixUnitaire, quantite } }
    const [saisies, setSaisies] = useState({});

    const [submitting, setSubmitting] = useState(false);


    const [afficherApercu, setAfficherApercu] = useState(false);
    const [idDemandeGenere, setIdDemandeGenere] = useState(null);
    
    const [error, setError] = useState(null); 

    const [frs, setFrs] = useState([]);   

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
            const d = res.data ;

            if(!d) throw new Error("Aucune donnée reçue");

            const listeUtilisateurs = utilisateursRes.data || [];
            const demandeurId = d.demandeurId ?? d.DemandeurId;
            const utilisateurTrouve = listeUtilisateurs.find(
                (u) => (u.id ?? u.Id) === demandeurId
            );
    
            const demandesFormatees ={
                id : d.id ?? d.Id,
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
                // d.articles correspond à votre "List<ArticleResponseDto> Articles" côté C#
                lots: (d.articles ?? d.Articles ?? []).map((a) => ({
                    id: a.id ?? a.Id ?? 0,  
                    codeLot: a.codeLot ?? a.CodeLot ?? "",
                    designation: a.designation ?? a.Designation ?? ""
                })),
            };
            setDemandes(demandesFormatees);

            //Initialisation d'une ligne de saisie vide par article
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

    // gestion des champs
    const updateDossierField = (field, value) => {
        setDossierData((prev) => ({
            ...prev, [field]: value
        }));
    };

    const updateSaisieArticle = (articleId, field, value) => 
    {
        setSaisies((prev) => ({
            ...prev, [articleId] : { ...prev[articleId], [field]: value },
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

    // if (loading) return <div className="container mt-5">Chargement de la demande...</div>;s

    const valeurCAF = useMemo(() => {
        const fob = parseFloat(dossierData.fobTotal) || 0;
        const mfob = parseFloat(dossierData.mfobTotal) || 0;
        const fret = parseFloat(dossierData.fretTotal) || 0;
        const assurance = ((fob + mfob + fret) * taux_assurance) / 100;
        const valcaf = fob + mfob + fret + assurance;
        return round4(valcaf * (parseFloat(dossierData.cours) || 0));
    }, [dossierData.fobTotal, dossierData.mfobTotal, dossierData.fretTotal]);

    // CalculefraisApprocheTotal = () => {
    const detailFraisApproche = useMemo(() => {
        const tc = parseFloat(dossierData.tc) || 0;
        const clesFrais = ["deboursMagasinage", "commissionBancaires", "prestationGasyNet", "apmf","ddp", "controleRadioactive", "autresDat"
        ];
        
        const deboursTransitTranslate = parseFloat(dossierData.deboursTransit * dossierData.cours) || 0;
        const commissionRemunTranslate = parseFloat(dossierData.commissionRemun * valeurCAF /100) || 0;
        const commissionBancairesTranslate = parseFloat(dossierData.commissionBancaires * valeurCAF) || 0;
        const douanesTranslate = parseFloat(dossierData.douanes * valeurCAF /100) || 0;
        const prestationGasyNetTranslate = parseFloat(dossierData.prestationGasyNet) || 0;
        const transportLocalTranslate = parseFloat(dossierData.transportLocal) || 0;
        const transportLocalTotal = transportLocalTranslate * tc;
        const maritimeFret = parseFloat(dossierData.fretTotal * dossierData.cours) || 0;
        const maritimeMfob = parseFloat(dossierData.mfobTotal * dossierData.cours) || 0;
        const totalAutresFrais = clesFrais.reduce((total, cle) => {
            const valeur = parseFloat(dossierData[cle]) || 0;
            return total + valeur;
        }, 0) + transportLocalTotal;

        const pourcentdeboursTransit = valeurCAF ? parseFloat(dossierData.deboursTransit * dossierData.cours * (parseFloat(dossierData.tc) || 0) / valeurCAF *100) : 0;
        const pourcentTransport = valeurCAF ? parseFloat(transportLocalTranslate/valeurCAF * 100) : 0;
        const pourcentcommissionRemun = valeurCAF ? parseFloat(commissionRemunTranslate/valeurCAF * 100) : 0;
        const pourcentcommissionBancaire = valeurCAF ? parseFloat(dossierData.commissionBancaires/valeurCAF * 100) : 0;
        const pourcentdouanes = valeurCAF ? parseFloat(douanesTranslate/valeurCAF * 100) : 0;
        const pourcentprestationGasyNet = valeurCAF ? parseFloat(prestationGasyNetTranslate/valeurCAF * 100) : 0;
        
        const total = round4(maritimeFret + maritimeMfob + totalAutresFrais + deboursTransitTranslate + commissionRemunTranslate + douanesTranslate);

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

    const fmtPct = (v) => (parseFloat(v) || 0).toLocaleString("fr-FR", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    });

  // ── Calculs dérivés (recalculés à chaque changement) ────────────────

  // Pour le type "Canettes", chaque lot est scindé en 2 lignes (Canette 1 / Canette 2)
  // identiques en calcul. Les autres types produisent une seule ligne par lot.
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
  }, [valeurCAF, fraisApprocheTotalCalcule, dossierData.mfobTotal, dossierData.fretTotal]);

  const resultatsParArticle = useMemo(() => {
    if (!demandes) return {};
    const resultats = {};

    //1. D'abord, on calcule le totalPu de TOUS les articles saisis
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

      // Ta formule exacte : (PU * TotalGénéralAr) / (TotalPuSaisi * Quantité)
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
 
  // Totaux généraux (pour vérification / affichage en bas de tableau)
  const totaux = useMemo(() => {
    const valeurs = Object.values(resultatsParArticle);

    // Somme des pu saisi par l'user
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
 


  // Calcule toutes les valeurs dérivées pour un article donné
function calculerArticle(lot, dossierData, montantTotalDossier) {
  const montant = calcMontant(lot.prixUnitaire, lot.quantite);
  const proportion = calcProportion(montant, montantTotalDossier);
 
  const partCout = calcPartProrata(dossierData.fobTotal, proportion);
  const partMfob = calcPartProrata(dossierData.mfobTotal, proportion);
  const partFret = calcPartProrata(dossierData.fretTotal, proportion);
 
  // Coût et Fret (CFR) de l'article
  const cfr = partCout + partMfob + partFret;
 
  // Assurance 0,2% sur le CFR de l'article
  const assurance = round4((cfr * taux_assurance) / 100);
 
  // Part des frais d'approche du dossier (déjà en Ariary)
  const partFraisApproche = calcPartProrata(
    dossierData.fraisApprocheTotal,
    proportion
  );
 
  // Valeur CAF de l'article (devise)
  const valeurCaf = cfr + assurance;
 
  const cours = parseFloat(dossierData.cours) || 0;
//   const quantite = parseFloat(lot.quantite) || 0;
 
  // Coût total de l'article en Ariary = (CAF en devise x cours) + frais d'approche (déjà en Ar)
  const coutTotalAr = valeurCaf * cours + partFraisApproche;

//   const totalPu = demandes ? demandes.lots.reduce((s, lot) => {
//     const pu = parseFloat(saisies[lot.id]?.prixUnitaire) || 0;
//     return s + pu;
//   }, 0) : 0;


 
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


  // ── Soumission ───────────────────────────────────────────────────────
 const handleSubmit = async (e) => {
  e.preventDefault();

  // 1. Vérification que tous les champs obligatoires du tableau sont remplis
  const lignesIncompletes = lignes.filter(({ rowKey }) => {
    const s = saisies[rowKey];
    return !s?.prixUnitaire || !s?.quantite;
  });

  if (lignesIncompletes.length > 0) {
    toast.error("Veuillez remplir le prix unitaire et la quantité pour chaque article");
    return;
  }

  // 2. Pas d'appel API ici ! On stocke temporairement l'ID et on affiche l'aperçu
  setIdDemandeGenere(id);
   setAfficherApercu(true);
};

   const fetchFrs = async () => {
     try{
        setLoading(true);
        setError(null);
        const response = await frsService.getAll();
        setFrs(response.data);
    }catch(err){
        setError(err.message || "Erreur de chargement")
    }finally{
        setLoading(false);
    }
  }
    useEffect(()=>{
        fetchFrs();
    }, [])


    if (afficherApercu) {
        const articlesFormates = lignes.map(({ rowKey, lot }) => ({
            id: rowKey,
            designation: lot.designation,
            codeLot: lot.codeLot,
            prixUnitaire: saisies[rowKey]?.prixUnitaire || 0,
            quantite: saisies[rowKey]?.quantite || 0,
            immo: saisies[rowKey]?.immo || "",
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

    if (!demandes) return <div className="container mt-5 text-danger">Demande introuvable.</div>;
   

    const STATUS_STYLES = {
    "Nouvelle": {
        backgroundColor: "#a9caf5",
        color: "#000927",
        borderColor: "#BAE6FD"
    },
    "En attente": {
        backgroundColor: "#FEF9C3",
        color: "#854D0E",
        borderColor: "#FEF08A"
    },
    "Validée": {
        backgroundColor: "#DCFCE7",
        color: "#166534",
        borderColor: "#BBF7D0"
    },
    "Refusée": {
        backgroundColor: "#FFE4E6",
        color: "#9F1239",
        borderColor: "#FECDD3"
    }
};

// Style par défaut si le statut est inconnu
const STYLE_PAR_DEFAUT = { backgroundColor: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
   return<>
        <Nav/>
        <div className="container" style={{marginTop : "10rem"}}>
            <h2 className="traiter-title">Traitement de la Demande N° {String(id).padStart(3, '0')}</h2>
            <div className=" traiter-page ">
                <p><strong>Date de création :</strong> {demandes.date ? new Date(demandes.date).toLocaleDateString('fr-FR') : "Inconnue"}</p>
                {/* <p>
                    {
                        demandes.motif !== "En attente" && (
                            <span className="badge bg-warning text-dark">
                                Motif : {demandes.motif}
                            </span>
                        )
                    }
                </p> */}
                <p><strong>Statut actuel :</strong> <span style={{
                    backgroundColor: demandes.status === "Nouvelle" ? "#a9caf5" : demandes.status === "En attente" ? "#FEF9C3" : demandes.status === "Validée" ? "#DCFCE7" : "#FFE4E6",
                    color: demandes.status === "Nouvelle" ? "#000927" : demandes.status === "En attente" ? "#854D0E" : demandes.status === "Validée" ? "#166534" : "#9F1239",
                }}>{demandes.status}</span></p>

                <div className="row ">
                    
                    <p><strong>Demandeur :</strong> {demandes.nomDemandeur} {demandes.prenomDemandeur}</p>
                    <p><strong>Matricule :</strong> {demandes.matricule}</p>
                    <p><strong>Site :</strong> {demandes.site || "Non défini"}</p>
                
                </div>

                <form action="" onSubmit={handleSubmit} method="post">
                    {/* ── Données globales du dossier ─────────────────────────── */}
                     <div className=" card mt-3 p-4">
                         <div className="row g-3">
                              <div className="col-md-4">
                                 <label htmlFor="" className="form-label">Type de demande</label>

                                 
                                 <select name="typeDossier" id="" className="form-control" value={dossierData.typeDossier} onChange={(e) => updateDossierField("typeDossier", e.target.value)}>
                                     <option value="">Sélectionner le type</option>
                                      <option value="Groupage">Groupage</option>
                                      <option value="Malte">Malte</option>
                                      <option value="Sucre">Sucre</option>
                                      <option value="Canettes">Canettes</option>
                                      <option value="Aériens">Aériens</option>
                                  </select>
                             </div>
                             <div className="col-md-4">
                                 <label htmlFor="" className="form-label">Nombre TC</label>

                                 <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={dossierData.tc}
                                    onChange={(e) => updateDossierField("tc", e.target.value)}
                                    required
                                    />
                             </div>

                              <div className="col-md-4">
                                  <label htmlFor="" className="form-label">Origine</label>

                                  
                                  <select name="origine" id="" className="form-control" value={dossierData.origine || ""} onChange={(e) => updateDossierField("origine", e.target.value)}>
                                      <option value="">Sélectionner l'origine</option>
                                      {paysData.map((pays) => (
                                          <option key={pays.code} value={pays.nom}>
                                              {pays.drapeau} {pays.nom}
                                          </option>
                                      ))}
                                  </select>
                              </div>

                               <div className="col-md-4">
                                 <label htmlFor="" className="form-label">Fournisseur</label>

                                 
                                 <select name="frs" id="" className="form-control" value={dossierData.frs || ""} onChange={(e) => updateDossierField("frs", e.target.value)} disabled={loading}>
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

                         <div className="col-md-4">
                                 <label htmlFor="" className="form-label">Port</label>

                                 
                                 <select name="port" id="" className="form-control" value={dossierData.port} onChange={(e) => updateDossierField("port", e.target.value)}>
                                     <option value="">Sélectionner le port</option>
                                     <option value="Diégo">Diégo</option>
                                     <option value="Tamatave">Tamatave</option>
                                    
                                 </select>
                             </div>

                             <div className="col-md-4">
                                 <label htmlFor="" className="form-label">Usine</label>

                                 
                                 <select name="usine" id="" className="form-control" value={dossierData.usine} onChange={(e) => updateDossierField("usine", e.target.value)}>
                                     <option value="">Sélectionner l'usine</option>
                                     <option value="Antsirabe">Antsirabe</option>
                                     <option value="Ambatolampy">Ambatolampy</option>
                                 </select>
                             </div>

                           
                         </div>
                     </div>

                    <div className=" card mt-3 p-4">

                        <h4>Données générales du dossier</h4>
                        <div className="row g-3">

                            <div className="col-md-4">
                                <label htmlFor="" className="form-label">Cours de change (Ar)</label>

                                <input type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={dossierData.cours}
                                    onChange={(e) => updateDossierField("cours", e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">FOB total (devise)</label>
                                <input  type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={dossierData.fobTotal}
                                    onChange={(e) => updateDossierField("fobTotal", e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">MFOB total (devise)</label>
                                <input type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={dossierData.mfobTotal}
                                    onChange={(e) => updateDossierField("mfobTotal", e.target.value)}
                                    required
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Fret total (devise)</label>
                                <input type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={dossierData.fretTotal}
                                    onChange={(e) => updateDossierField("fretTotal", e.target.value)}
                                required
                                />
                            </div>
                            <div className="col-md-4"></div>
                            <div className="col-md-4"></div>
                            <div className="col-md-4">
                                <label className="form-label">
                                    Valeur CAF totale (Ar)
                                        
                                </label>
                                <input type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={valeurCAF}
                                    readOnly
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">
                                Frais d'approche totaux (Ar)
                                
                                </label>
                                <input type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={fraisApprocheTotalCalcule}
                                    readOnly
                                />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">
                                    Total général (Ar)
                                </label>
                                <input type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={total}
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card mt-3 p-4">
                        <h4>Détail des frais d'approche</h4>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <label className="form-label">Frais à l'arrivée par TC <small className="text-muted fw-normal">(€ / devise)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.deboursTransit} onChange={(e) => updateDossierField("deboursTransit", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Débours Magasinage <small className="text-muted fw-normal">(Ar)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.deboursMagasinage} onChange={(e) => updateDossierField("deboursMagasinage", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Transport Local <small className="text-muted fw-normal">(Ar)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.transportLocal} onChange={(e) => updateDossierField("transportLocal", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Commission SACOFRINA <small className="text-muted fw-normal">(%)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.commissionRemun} onChange={(e) => updateDossierField("commissionRemun", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Commission Bancaires <small className="text-muted fw-normal">(Ar)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.commissionBancaires} onChange={(e) => updateDossierField("commissionBancaires", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Douanes <small className="text-muted fw-normal">(%)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.douanes} onChange={(e) => updateDossierField("douanes", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Prestation GasyNet <small className="text-muted fw-normal">(Ar)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.prestationGasyNet} onChange={(e) => updateDossierField("prestationGasyNet", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">APMF <small className="text-muted fw-normal">(Ar)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.apmf} onChange={(e) => updateDossierField("apmf", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">DDP <small className="text-muted fw-normal">(Ar)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.ddp} onChange={(e) => updateDossierField("ddp", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Contrôle Radioactive <small className="text-muted fw-normal">(Ar)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.controleRadioactive} onChange={(e) => updateDossierField("controleRadioactive", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Autres DAT <small className="text-muted fw-normal">(Ar)</small></label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.autresDat} onChange={(e) => updateDossierField("autresDat", e.target.value)} />
                            </div>
                        </div>
                    </div>

                     {/* ── Tableau articles avec calculs automatiques ──────────── */}
                    <div className="card mt-3 p-4">
                        
            
                        <div className="table-responsive">
                        <table className="table table-bordered table-sm align-middle">
                            <thead className="table-light">
                            <tr>
                                <th>Désignation</th>
                                <th>Code IMMO</th>
                                <th style={{ width: "110px" }}>Montant (devise)<br/><small className="text-muted">saisi</small></th>
                                <th style={{ width: "90px" }}>Quantité<br/><small className="text-muted">saisi</small></th>
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
                                    {label && (
                                        <span className="badge bg-info text-dark ms-1">{label}</span>
                                    )}
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
                                    </td>
                                     <td>
                                        <input
                                            type="text"
                                            step="0.01"

                                            className="form-control form-control-sm"
                                            value={saisie.immo}
                                            onChange={(e) =>
                                            updateSaisieArticle(rowKey, "immo", e.target.value)
                                            }
                                            placeholder="Code IMMO"
                                        />
                                    </td>
             
                                    {/* ✏️ Champ saisi */}
                                    <td>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control form-control-sm"
                                        value={saisie.prixUnitaire}
                                        onChange={(e) =>
                                        updateSaisieArticle(rowKey, "prixUnitaire", e.target.value)
                                        }
                                        required
                                    />
                                    </td>
             
                                    {/* ✏️ Champ saisi */}
                                    <td>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control form-control-sm"
                                        value={saisie.quantite}
                                        onChange={(e) =>
                                        updateSaisieArticle(rowKey, "quantite", e.target.value)
                                        }
                                        required
                                    />
                                    </td>
             
                                    {/* Calcul automatique en lecture seule */}
                                    <td className="text-end">{fmt(r.montant)}</td>
                                    {/* ✏️ Champ saisi - Code IMMO */}
                                   
                                    <td className="text-end">
                                        <strong>{fmt(r.puAriary)} Ar</strong>
                                    </td>
                                </tr>
                                );
                            })}
                            </tbody>
                            <tfoot>
                            <tr className="table-light">
                                <td className=""><strong>Totaux</strong></td>
                                <td></td>
                                <td className="text-end"><strong>{fmt(totaux.totalPu)}</strong></td>
                                
                            </tr>
                            </tfoot>
                            <div className="row">
                           
                        </div>
                        </table>
                         <div className="col-12">
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
                        </div>
                    </div>
            
                    {demandes.status === "Nouvelle" && (
                        <div className="mt-3 mb-5 text-end">
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                            {submitting ? "Enregistrement..." : "Enregistrer le traitement"}
                            </button>
                        </div>
                    )}
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
}