import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom"
import { demandeService, frsService, origineService } from "../../../services/api";
import { toast } from "sonner";
import Nav from "../../nav/nav";
import "./traitement.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PageApercuDemande from "./PageApercuDemande";

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
        remunerationTransit : "",
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
    return pu * qte;
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
function fmt(n, decimals = 2) {
  if (!isFinite(n)) return "0";
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
 


export function TraitementDemande(){
    const {id} = useParams();
    const [loading, setLoading] = useState(true);
    const [demandeId, setDemandeId] = useState(id);
    const [demandes, setDemandes] = useState(null);

    // données globales du dossier (saisies une seule fois)
    const [dossierData, setDossierData] = useState(emptyDossierData());

    // Saisie par article : {  [articleId]: { prixUnitaire, quantite } }
    const [saisies, setSaisies] = useState({});

    const [submitting, setSubmitting] = useState(false);


    const [afficherApercu, setAfficherApercu] = useState(false);
    const [idDemandeGenere, setIdDemandeGenere] = useState(null);
    
    const [error, setError] = useState(null); 

    const [origine, setOrigine] = useState([]);   
    const [frs, setFrs] = useState([]);   

    const fetchDemandes = async () => {

        setLoading(true);

        try {
            const res = await demandeService.getDemande(id);
            const d = res.data ;

            if(!d) throw new Error("Aucune donnée reçue");
    
            const demandesFormatees ={
                id : d.id ?? d.Id,
                motif: d.motif ?? d.Motif ?? "",
                status: d.status ?? d.Status ?? "Nouvelle",
                date: d.dateTime ?? d.DateTime,
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

    // if (loading) return <div className="container mt-5">Chargement de la demande...</div>;s


    // CalculefraisApprocheTotal = () => {
    const fraisApprocheTotalCalcule = useMemo(() => {
        const clesFrais = ["deboursTransit", "remunerationTransit", "deboursMagasinage", "transportLocal", "commissionRemun", "commissionBancaires", "douanes", "prestationGasyNet", "apmf","ddp", "controleRadioactive", "autresDat"
        ];
        
        const maritimeFret = parseFloat(dossierData.fretTotal * dossierData.cours) || 0;
        const maritimeMfob = parseFloat(dossierData.mfobTotal * dossierData.cours) || 0;
        const totalAutresFrais = clesFrais.reduce((total, cle) => {
            const valeur = parseFloat(dossierData[cle]) || 0;
            return total + valeur;
        }, 0);
        
        return maritimeFret + maritimeMfob + totalAutresFrais;
    }, [dossierData]);

    // ── Calculs dérivés (recalculés à chaque changement) ────────────────
 
  const montantTotalDossier = useMemo(() => {
    if (!demandes) return 0;
    const lots = demandes.lots.map((lot) => saisies[lot.id] || emptyArticleSaisie());
    return calcMontantTotalDossier(lots);
  }, [demandes, saisies]);
 

  const valeurCAF = useMemo(() => {
    const fob = parseFloat(dossierData.fobTotal) || 0;
    const mfob = parseFloat(dossierData.mfobTotal) || 0;
    const fret = parseFloat(dossierData.fretTotal) || 0;
    const assurance = ((fob + mfob + fret) * taux_assurance) / 100;
    const valcaf = fob + mfob + fret + assurance;
    return valcaf * (parseFloat(dossierData.cours) || 0);
  }, [dossierData.fobTotal, dossierData.mfobTotal, dossierData.fretTotal]);

  const total = useMemo(() => {
    const mfob = parseFloat(dossierData.mfobTotal) || 0;
    const fret = parseFloat(dossierData.fretTotal) || 0;
    return valeurCAF + fraisApprocheTotalCalcule - ((mfob + fret) * (parseFloat(dossierData.cours) || 0));
  }, [valeurCAF, fraisApprocheTotalCalcule, dossierData.mfobTotal, dossierData.fretTotal]);

  const resultatsParArticle = useMemo(() => {
    if (!demandes) return {};
    const resultats = {};

    //1. D'abord, on calcule le totalPu de TOUS les articles saisis
    const totalPuSaisi = demandes.lots.reduce((sum, lot) => {
      const saisie = saisies[lot.id] || emptyArticleSaisie();
      return sum + (parseFloat(saisie.prixUnitaire) || 0);
    }, 0);

    demandes.lots.forEach((lot) => {
      const saisie = saisies[lot.id] || emptyArticleSaisie();
      
      const base = calculerArticle(
        { ...lot, prixUnitaire: saisie.prixUnitaire, quantite: saisie.quantite },
        { ...dossierData, fraisApprocheTotal: fraisApprocheTotalCalcule },
        montantTotalDossier
      );

      // Ta formule exacte : (PU * TotalGénéralAr) / (TotalPuSaisi * Quantité)
      const puSaisi = parseFloat(saisie.prixUnitaire) || 0;
      const qteSaisie = parseFloat(saisie.quantite) || 0;
   
      const puAriaryCalcule = (totalPuSaisi > 0 && qteSaisie > 0) ? (puSaisi * total) / (totalPuSaisi * qteSaisie) : 0;


      resultats[lot.id] = {
        ...base,
        puAriary: puAriaryCalcule,
      };
    });
    return resultats;
  }, [demandes, saisies, dossierData, montantTotalDossier, total, fraisApprocheTotalCalcule]);
 
  // Totaux généraux (pour vérification / affichage en bas de tableau)
  const totaux = useMemo(() => {
    const valeurs = Object.values(resultatsParArticle);

    // Somme des pu saisi par l'user
    const totalPu = demandes ? demandes.lots.reduce((s, lot) => {
        const pu = parseFloat(saisies[lot.id]?.prixUnitaire) || 0;
        return s + pu;
    }, 0) : 0;

    return {
        totalPu,
        montant: valeurs.reduce((s, v) => s + v.montant, 0),
        cfr: valeurs.reduce((s, v) => s + v.cfr, 0),
        assurance: valeurs.reduce((s, v) => s + v.assurance, 0),
        coutTotalAr: valeurs.reduce((s, v) => s + v.coutTotalAr, 0),
    };
  }, [resultatsParArticle, demandes, saisies]);
 


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
  const assurance = (cfr * taux_assurance) / 100;
 
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
  const lignesIncompletes = demandes.lots.filter((lot) => {
    const s = saisies[lot.id];
    return !s?.prixUnitaire || !s?.quantite;
  });

  if (lignesIncompletes.length > 0) {
    toast.error("Veuillez remplir le prix unitaire et la quantité pour chaque article");
    return;
  }

   if (lignesIncompletes.length > 0) {
    toast.error("Veuillez remplir le prix unitaire et la quantité pour chaque article");
    return;
  }

  // 2. Pas d'appel API ici ! On stocke temporairement l'ID et on affiche l'aperçu
  setIdDemandeGenere(id);
  setAfficherApercu(true);
};

// Fonction de génération et mise en page du PDF regroupé


  const fetchOrigine = async () => {
     try{
        setLoading(true);
        setError(null);
        const response = await origineService.getAll();
        setOrigine(response.data);
    }catch(err){
        setError(err.message || "Erreur de chargement")
    }finally{
        setLoading(false);
    }
  }
    useEffect(()=>{
        fetchOrigine();
    }, [])
    

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
        // Transformer l'objet resultatsParArticle en tableau pour l'aperçu
        const articlesFormates = demandes.lots.map(lot => ({
            id: lot.id,
            designation: lot.designation,
            codeLot: lot.codeLot,
            prixUnitaire: saisies[lot.id]?.prixUnitaire || 0,
            quantite: saisies[lot.id]?.quantite || 0,
            immo: saisies[lot.id]?.immo || "",
            // On passe les données calculées en temps réel
            partFraisApproche: resultatsParArticle[lot.id]?.partFraisApproche || 0,
            puAriary: resultatsParArticle[lot.id]?.puAriary || 0
        }));

        return (
            <PageApercuDemande 
                idDemande={idDemandeGenere} 
                userRole="Demandeur" 
                onRetour={() => setAfficherApercu(false)} 
                // 💡 On injecte directement les vraies données saisies et calculées !
                donneesInitiales={{
                    dossierData: {
                        ...dossierData,
                        fraisApprocheTotal: fraisApprocheTotalCalcule 
                    },
                    articles: articlesFormates,
                    statut: demandes.status
                }}
            />
        );
    }
// const genererPDF = () => {
  
//     const doc = new jsPDF({
//         orientation:"portrait",
//         unit:"mm",
//         format:"a4",
//     });

//     const margeGauche = 20;
//     let yPosition = 20;

//     doc.setFont("helvetica", "normal");

//     // ─── SECTION 1 : EN-TÊTE (Ex: Logo, Nom entreprise) ───
//     doc.setFontSize(20);
//     doc.setFont("helvetica", "bold");
//     doc.text("Nom de l'entreprise", margeGauche, yPosition);
//     yPosition += 10;

//     doc.setFontSize(12);
//     doc.setFont("helvetica", "normal");
//     doc.text("Adresse, Ville, Pays | Contact : email@domain.com", margeGauche, yPosition);

//     // ─── LIGNE DE SÉPARATION GRAPHIQUE ───
//     yPosition += 5;
//     doc.setDrawColor(200, 200, 200);
//     doc.line(margeGauche, yPosition, 190, yPosition);

//   // ─── SECTION 2 : TITRE DU DOCUMENT ───
//     yPosition += 15;
//     doc.setFontSize(16);
//     doc.setFont("helvetica", "bold");
//     doc.text("TITRE DU DOCUMENT", margeGauche, yPosition);  

//     // ─── SECTION 3 : LE CONTENU (À personnaliser) ───
//     yPosition += 12;
//     doc.setFontSize(11);
//     doc.setFont("helvetica", "normal");

//     // Exemple de texte dynamique ou statique
//     doc.text(`Référence : REF-2026-001`, margeGauche, yPosition);
//     yPosition += 7;
//     doc.text(`Date : ${new Date().toLocaleDateString()}`, margeGauche, yPosition);

//     yPosition += 15;
//     // Bloc de texte long ou paragraphes
//     const paragraphe = "<h1>Titre de l'article</h1><p>Contenu de l'article...</p>";

//     // splitTextToSize permet de couper automatiquement le texte pour qu'il ne dépasse pas de la page
//     const texteFormate = doc.splitTextToSize(paragraphe, 170);
//     doc.text(texteFormate, margeGauche, yPosition);

//     // ─── SECTION 4 : PIED DE PAGE ───
//   // On force la position tout en bas de la page A4 (Hauteur totale ~297mm)
//     const positionBasDePage = 280;
//     doc.setFontSize(9);
//     doc.setTextColor(120, 120, 120);
//     doc.text("Page 1 sur 1 — Document généré automatiquement.", margeGauche, positionBasDePage);

//     // 5. TÉLÉCHARGEMENT DU FICHIER
//     doc.save("mon-document-personnalise.pdf");

// };

   // ─────────────────────────────────────────────────────────────────────
  // Rendu
  // ─────────────────────────────────────────────────────────────────────
 
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
        backgroundColor: "#E0F2FE", // Bleu pastel très doux
        color: "#0369A1",           // Texte bleu foncé
        borderColor: "#BAE6FD"
    },
    "En attente": {
        backgroundColor: "#FEF9C3", // Jaune pastel (ton choix - parfait)
        color: "#854D0E",           // Texte marron/doré foncé
        borderColor: "#FEF08A"
    },
    "Validée": {
        backgroundColor: "#DCFCE7", // Vert pastel (ton choix - parfait)
        color: "#166534",           // Texte vert foncé
        borderColor: "#BBF7D0"
    },
    "Refusée": {
        backgroundColor: "#FFE4E6", // Rouge/Rose pastel (ton choix - parfait)
        color: "#9F1239",           // Texte rouge foncé
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
                <p>
                    {
                        demandes.motif !== "En attente" && (
                            <span className="badge bg-warning text-dark">
                                Motif : {demandes.motif}
                            </span>
                        )
                    }
                </p>
                <p><strong>Statut actuel :</strong> <span style={{
                    backgroundColor: demandes.status === "Nouvelle" ? "#a9caf5" : demandes.status === "En attente" ? "#FEF9C3" : demandes.status === "Validée" ? "#DCFCE7" : "#FFE4E6",
                    color: demandes.status === "Nouvelle" ? "#000927" : demandes.status === "En attente" ? "#854D0E" : demandes.status === "Validée" ? "#166534" : "#9F1239",
                }}>{demandes.status}</span></p>

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

                                 
                                 <select name="origine" id="" className="form-control" value={dossierData.origine || ""} onChange={(e) => updateDossierField("origine", e.target.value)} disabled={loading}>
                                     <option value="">
                                         {loading ? "Chargement des origines..." : "Sélectionner l'origine"}
                                     </option>
                                     {!loading && origine && origine.map((orig) => (
                                         <option key={orig.id || orig.Id} value={orig.pays || orig.Pays || orig}>
                                             {orig.pays || orig.Pays || orig}
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

                            <div className="col-md-2">
                                <label htmlFor="" className="form-label">Cours de change (Ar)</label>

                                <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={dossierData.cours}
                                    onChange={(e) => updateDossierField("cours", e.target.value)}
                                    required
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">FOB total (devise)</label>
                                    <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={dossierData.fobTotal}
                                    onChange={(e) => updateDossierField("fobTotal", e.target.value)}
                                    required
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">MFOB total (devise)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control"
                                        value={dossierData.mfobTotal}
                                        onChange={(e) => updateDossierField("mfobTotal", e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-2">
                                    <label className="form-label">Fret total (devise)</label>
                                    <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={dossierData.fretTotal}
                                    onChange={(e) => updateDossierField("fretTotal", e.target.value)}
                                    required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Valeur CAF totale (Ar)
                                        <small className="text-muted"> — (FOB + MFOB + Fret) + Assurance</small>
                                    </label>
                                    <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={valeurCAF}
                                    readOnly
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">
                                    Frais d'approche totaux (Ar)
                                    <small className="text-muted"> — douane, GasyNet, transit, transport...</small>
                                    </label>
                                    <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={fraisApprocheTotalCalcule}
                                    readOnly
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">
                                        Total général (Ar)
                                        <small className="text-muted"> — Valeur CAF + Frais d'approche</small>
                                    </label>
                                    <input
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={total}
                                    readOnly
                                    />
                                </div>
                        </div>
                    </div>

                    {/* ── Détail des frais d'approche ─────────────────────────────── */}
                    <div className="card mt-3 p-4">
                        <h4>Détail des frais d'approche (Ariary)</h4>
                        <div className="row g-3">
                            <div className="col-md-4">
                                <label className="form-label">Débours Transit</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.deboursTransit} onChange={(e) => updateDossierField("deboursTransit", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Rémunération Transit</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.remunerationTransit} onChange={(e) => updateDossierField("remunerationTransit", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Débours Magasinage</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.deboursMagasinage} onChange={(e) => updateDossierField("deboursMagasinage", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Transport Local</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.transportLocal} onChange={(e) => updateDossierField("transportLocal", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Commission Rémun</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.commissionRemun} onChange={(e) => updateDossierField("commissionRemun", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Commission Bancaires</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.commissionBancaires} onChange={(e) => updateDossierField("commissionBancaires", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Douanes</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.douanes} onChange={(e) => updateDossierField("douanes", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Prestation GasyNet</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.prestationGasyNet} onChange={(e) => updateDossierField("prestationGasyNet", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">APMF</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.apmf} onChange={(e) => updateDossierField("apmf", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">DDP</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.ddp} onChange={(e) => updateDossierField("ddp", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Contrôle Radioactive</label>
                                <input type="number" step="0.01" className="form-control" value={dossierData.controleRadioactive} onChange={(e) => updateDossierField("controleRadioactive", e.target.value)} />
                            </div>
                            <div className="col-md-4">
                                <label className="form-label">Autres DAT</label>
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
                                <th style={{ width: "110px" }}>PU (devise)<br/><small className="text-muted">saisi</small></th>
                                <th style={{ width: "90px" }}>Quantité<br/><small className="text-muted">saisi</small></th>
                                <th>Montant</th>
                                <th>Code IMMO</th>
                                <th>PU en Ariary</th>
                            </tr>
                            </thead>
                            <tbody>
                            {demandes.lots.map((lot) => {
                                const saisie = saisies[lot.id] || emptyArticleSaisie();
                                const r = resultatsParArticle[lot.id] || {};
                                return (
                                <tr key={lot.id}>
                                    <td>
                                    <strong>{lot.codeLot}</strong>
                                    <br />
                                    <small className="text-muted">{lot.designation}</small>
                                    </td>
            
                                    {/* ✏️ Champ saisi */}
                                    <td>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control form-control-sm"
                                        value={saisie.prixUnitaire}
                                        onChange={(e) =>
                                        updateSaisieArticle(lot.id, "prixUnitaire", e.target.value)
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
                                        updateSaisieArticle(lot.id, "quantite", e.target.value)
                                        }
                                        required
                                    />
                                    </td>
            
                                    {/* Calcul automatique en lecture seule */}
                                    <td className="text-end">{fmt(r.montant)}</td>
                                    {/* ✏️ Champ saisi - Code IMMO */}
                                    <td>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={saisie.immo}
                                            onChange={(e) =>
                                            updateSaisieArticle(lot.id, "immo", e.target.value)
                                            }
                                            placeholder="Code IMMO"
                                        />
                                    </td>
                                    <td className="text-end">
                                        <strong>{fmt(r.puAriary)} Ar</strong>
                                    </td>
                                </tr>
                                );
                            })}
                            </tbody>
                            <tfoot>
                            <tr className="table-light">
                                <td className="text-end"><strong>Totaux</strong></td>
                                <td className="text-end"><strong>{fmt(totaux.totalPu)}</strong></td>
                                
                            </tr>
                            </tfoot>
                        </table>
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
    </>
}