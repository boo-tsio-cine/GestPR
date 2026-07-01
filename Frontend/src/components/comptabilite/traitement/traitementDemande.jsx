import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom"
import { demandeService } from "../../../services/api";
import { toast } from "sonner";
import Nav from "../../nav/nav";
import "./traitement.css";



const taux_assurance = 0.2 ;

function emptyDossierData(){
    return{
        cours: "" ,
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
        controleRadioactive: "",
        autresDat: "",
    };
}

function emptyArticleSaisie(){
    return {
        prixUnitaire:"",
        quantite : "",
    };
}


function calculeFraisApprocheTotal(dossierData){
    fraisApprocheTotal = 0;
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
  const quantite = parseFloat(lot.quantite) || 0;
 
  // Coût total de l'article en Ariary = (CAF en devise x cours) + frais d'approche (déjà en Ar)
  const coutTotalAr = valeurCaf * cours + partFraisApproche;
 
  // Prix Unitaire en Ariary
  const puAriary = quantite > 0 ? coutTotalAr / quantite : 0;
 
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
    puAriary,
  };
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
        const clesFrais = ["deboursTransit", "remunerationTransit", "deboursMagasinage", "transportLocal", "commissionRemun", "commissionBancaires", "douanes", "prestationGasyNet", "apmf", "controleRadioactive", "autresDat"
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
 

  const coutetfret = dossierData.coutTotalAr + dossierData.mfobTotal + dossierData.fretTotal;
  const assurance = (coutetfret * taux_assurance) / 100;
  const valeurCAF = coutetfret + assurance;


  const resultatsParArticle = useMemo(() => {
    if (!demandes) return {};
    const resultats = {};
    demandes.lots.forEach((lot) => {
      const saisie = saisies[lot.id] || emptyArticleSaisie();
      resultats[lot.id] = calculerArticle(saisie, {...dossierData, fraisApprocheTotal: fraisApprocheTotalCalcule}, montantTotalDossier);
    });
    return resultats;
  }, [demandes, saisies, dossierData, montantTotalDossier]);
 
  // Totaux généraux (pour vérification / affichage en bas de tableau)
  const totaux = useMemo(() => {
    const valeurs = Object.values(resultatsParArticle);
    return {
      montant: valeurs.reduce((s, v) => s + v.montant, 0),
      cfr: valeurs.reduce((s, v) => s + v.cfr, 0),
      assurance: valeurs.reduce((s, v) => s + v.assurance, 0),
      coutTotalAr: valeurs.reduce((s, v) => s + v.coutTotalAr, 0),
    };
  }, [resultatsParArticle]);
 
  const totalAr = valeurCAF + fraisApprocheTotalCalcule;

  // ── Soumission ───────────────────────────────────────────────────────
 
  const handleSubmit = async (e) => {
    e.preventDefault();
 
    const lignesIncompletes = demandes.lots.filter((lot) => {
      const s = saisies[lot.id];
      return !s?.prixUnitaire || !s?.quantite;
    });
 
    if (lignesIncompletes.length > 0) {
      toast.error("Veuillez remplir le prix unitaire et la quantité pour chaque article");
      return;
    }
 
    setSubmitting(true);
    try {
      const articles = demandes.lots.map((lot) => {
        const saisie = saisies[lot.id];
        const resultat = resultatsParArticle[lot.id];
        return {
          idArticle: lot.id,
          prixUnitaire: parseFloat(saisie.prixUnitaire),
          quantite: parseFloat(saisie.quantite),
          montant: resultat.montant,
          proportion: resultat.proportion,
          cfr: resultat.cfr,
          assurance: resultat.assurance,
          coutTotalAr: resultat.coutTotalAr,
          puAriary: resultat.puAriary,
        };
      });
 
      await demandeService.enregistrerTraitement(id, {
        cours: parseFloat(dossierData.cours),
        fobTotal: parseFloat(dossierData.fobTotal),
        mfobTotal: parseFloat(dossierData.mfobTotal),
        fretTotal: parseFloat(dossierData.fretTotal),
        fraisApprocheTotal: fraisApprocheTotalCalcule,
        articles,
      });
 
      toast.success("Traitement enregistré avec succès !");
    } catch (err) {
      console.error("Erreur enregistrement:", err.response?.data || err);
      toast.error("Erreur lors de l'enregistrement du traitement");
    } finally {
      setSubmitting(false);
    }
  };


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
                    <div className=" ">
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
                                <th>% Dossier</th>
                                <th>CFR (devise)</th>
                                <th>Assurance</th>
                                <th>Frais approche (Ar)</th>
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
            
                                    {/* 🤖 Calculs automatiques en lecture seule */}
                                    <td className="text-end">{fmt(r.montant)}</td>
                                    <td className="text-end">{fmt(r.proportion)} %</td>
                                    <td className="text-end">{fmt(r.cfr)}</td>
                                    <td className="text-end">{fmt(r.assurance)}</td>
                                    <td className="text-end">{fmt(r.partFraisApproche)}</td>
                                    <td className="text-end">
                                    <strong>{fmt(r.puAriary)} Ar</strong>
                                    </td>
                                </tr>
                                );
                            })}
                            </tbody>
                            <tfoot>
                            <tr className="table-light">
                                <td colSpan={3}><strong>Totaux</strong></td>
                                <td className="text-end"><strong>{fmt(totaux.montant)}</strong></td>
                                <td className="text-end">100 %</td>
                                <td className="text-end"><strong>{fmt(totaux.cfr)}</strong></td>
                                <td className="text-end"><strong>{fmt(totaux.assurance)}</strong></td>
                                <td></td>
                                <td className="text-end"><strong>{fmt(totaux.coutTotalAr)} Ar</strong></td>
                            </tr>
                            </tfoot>
                        </table>
                        </div>
                    </div>
            
                    <div className="mt-3 mb-5 text-end">
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                        {submitting ? "Enregistrement..." : "Enregistrer le traitement"}
                        </button>
                    </div>
                </form>
                        
                
            </div>
        </div>
    </>
}