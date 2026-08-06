import { toast } from "sonner";
import { demandeService } from "../../../services/api";
import { useEffect, useMemo, useState} from 'react';
import { useNavigate } from "react-router-dom";
import html2pdf from 'html2pdf.js';
import "./PageApercuDemande.css";

const taux_assurance = 0.2;

function calcMontant(prixUnitaire, quantite) {
    const pu = parseFloat(prixUnitaire) || 0;
    const qte = parseFloat(quantite) || 0;
    return pu * qte;
}

function calcMontantTotalDossier(lots) {
    return lots.reduce(
        (total, lot) => total + calcMontant(lot.prixUnitaire, lot.quantite), 0
    );
}

function calcProportion(montantArticle, montantTotalDossier){
    if (!montantTotalDossier) return 0;
    return (montantArticle / montantTotalDossier) * 100;
}

function calcPartProrata(montantGlobal, proportion) {
    const total = parseFloat(montantGlobal) || 0;
    return (total * proportion) / 100;
}

function fmt(n, decimals = 2) {
    if (!isFinite(n)) return "0";
    return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(n);
}

export default function PageApercuDemande({idDemande, userRole = "Demandeur", onRetour, donneesInitiales }) {
    const navigate = useNavigate();
    const [dossierData, setDossierData] = useState(donneesInitiales?.dossierData || null);
    const [detailFraisApproche, setDetailFraisApproche] = useState(donneesInitiales?.detailFraisApproche || null);
    const [articles, setArticles] = useState(donneesInitiales?.articles || []);
    const [statut, setStatut] = useState(donneesInitiales?.statut || "Nouvelle");
    const [tauxAssurance, setTauxAssurance] = useState(donneesInitiales?.tauxAssurance ?? 0.2);
    const [loading, setLoading] = useState(!donneesInitiales);

    useEffect(() => {
        if (donneesInitiales) {
            setDossierData(donneesInitiales.dossierData);
            setDetailFraisApproche(donneesInitiales.detailFraisApproche);
            setArticles(donneesInitiales.articles);
            setStatut(donneesInitiales.statut);
            setTauxAssurance(donneesInitiales.tauxAssurance ?? 0.2);
            setLoading(false);
        } else {
            if (!idDemande) return;
            setLoading(true);

            demandeService.getDemande(idDemande)
                .then(res => {
                    setStatut(res.data?.status || "Nouvelle");
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [idDemande, donneesInitiales]);

    const fraisApprocheTotalCalcule = useMemo(() => {
        if (donneesInitiales?.fraisApprocheTotalCalcule != null) return donneesInitiales.fraisApprocheTotalCalcule;
        if (!dossierData) return 0;
        const clesFrais = ["deboursTransit", "deboursMagasinage", "transportLocal", "commissionRemun", "commissionBancaires", "douanes", "prestationGasyNet", "apmf", "ddp", "controleRadioactive", "autresDat"
        ];
        
        const maritimeFret = parseFloat(dossierData.fretTotal * dossierData.cours) || 0;
        const maritimeMfob = parseFloat(dossierData.mfobTotal * dossierData.cours) || 0;
        const totalAutresFrais = clesFrais.reduce((total, cle) => {
            const valeur = parseFloat(dossierData[cle]) || 0;
            return total + valeur;
        }, 0);
        
        return maritimeFret + maritimeMfob + totalAutresFrais;
    }, [dossierData]);

    const montantTotalDossier = useMemo(() => {
        if (!articles || articles.length === 0) return 0;
        return calcMontantTotalDossier(articles);
    }, [articles]);

    const valeurCAF = useMemo(() => {
        if (donneesInitiales?.valeurCAF != null) return donneesInitiales.valeurCAF;
        if (!dossierData) return 0;
        const fob = parseFloat(dossierData.fobTotal) || 0;
        const mfob = parseFloat(dossierData.mfobTotal) || 0;
        const fret = parseFloat(dossierData.fretTotal) || 0;
        const assurance = ((fob + mfob + fret) * taux_assurance) / 100;
        const valcaf = fob + mfob + fret + assurance;
        return valcaf * (parseFloat(dossierData.cours) || 0);
    }, [dossierData?.fobTotal, dossierData?.mfobTotal, dossierData?.fretTotal, dossierData?.cours]);

    const total = useMemo(() => {
        if (donneesInitiales?.total != null) return donneesInitiales.total;
        if (!dossierData) return 0;
        const mfob = parseFloat(dossierData.mfobTotal) || 0;
        const fret = parseFloat(dossierData.fretTotal) || 0;
        return valeurCAF + fraisApprocheTotalCalcule - ((mfob + fret) * (parseFloat(dossierData.cours) || 0));
    }, [valeurCAF, fraisApprocheTotalCalcule, dossierData?.mfobTotal, dossierData?.fretTotal, dossierData?.cours]);

    const resultatsParArticle = useMemo(() => {
        if (!articles || !dossierData) return {};
        const resultats = {};

        const totalPuSaisi = articles.reduce((sum, article) => {
            return sum + (parseFloat(article.prixUnitaire) || 0);
        }, 0);

        articles.forEach((article) => {
            const base = calculerArticle(
                { ...article, prixUnitaire: article.prixUnitaire, quantite: article.quantite },
                { ...dossierData, fraisApprocheTotal: fraisApprocheTotalCalcule },
                montantTotalDossier
            );

            const puSaisi = parseFloat(article.prixUnitaire) || 0;
            const qteSaisie = parseFloat(article.quantite) || 0;
        
            const puAriaryCalcule = (totalPuSaisi > 0 && qteSaisie > 0) ? (puSaisi * total) / (totalPuSaisi * qteSaisie) : 0;

            resultats[article.id] = {
                ...article,
                ...base,
                puAriary: puAriaryCalcule,
                immo: article.immo || ""
            };
        });
        return resultats;
    }, [articles, dossierData, montantTotalDossier, total, fraisApprocheTotalCalcule]);

    const totaux = useMemo(() => {
        const valeurs = Object.values(resultatsParArticle);

        const totalPu = articles ? articles.reduce((s, article) => {
            return s + (parseFloat(article.prixUnitaire) || 0);
        }, 0) : 0;

        return {
            totalPu,
            montant: valeurs.reduce((s, v) => s + (v.montant || 0), 0),
            cfr: valeurs.reduce((s, v) => s + (v.cfr || 0), 0),
            assurance: valeurs.reduce((s, v) => s + (v.assurance || 0), 0),
            coutTotalAr: valeurs.reduce((s, v) => s + (v.coutTotalAr || 0), 0),
        };
    }, [resultatsParArticle, articles]);

    function calculerArticle(lot, dossierData, montantTotalDossier) {
        const montant = calcMontant(lot.prixUnitaire, lot.quantite);
        const proportion = calcProportion(montant, montantTotalDossier);

        const partCout = calcPartProrata(dossierData.fobTotal, proportion);
        const partMfob = calcPartProrata(dossierData.mfobTotal, proportion);
        const partFret = calcPartProrata(dossierData.fretTotal, proportion);

        const cfr = partCout + partMfob + partFret;

        const assurance = (cfr * taux_assurance) / 100;

        const partFraisApproche = calcPartProrata(
            dossierData.fraisApprocheTotal,
            proportion
        );

        

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

   const handleChangerStatut = async (nouveauStatut) => {
        try {
            toast.info("Mise à jour du statut...");
            // Appel au backend
            await demandeService.updateStatus(idDemande, nouveauStatut);
            setStatut(nouveauStatut);
            toast.success(`La demande a été ${nouveauStatut.toLowerCase()} avec succès !`);
            
            if (onRetour) {
                setTimeout(() => onRetour(), 1500);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erreur lors du changement de statut");
        }
    };

    const handleExporterPDF = () => {
        const element = document.getElementById('zone-a4-pdf');
        const options = {
            margin: 0,
            filename: `Demande_Approche_N_${idDemande}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().from(element).save();
    };

   const handleEnvoyerOfficiel = async () => {
        // 1. Cibler la zone A4 simulée à l'écran
        const element = document.getElementById('zone-a4-pdf');
        if (!element) {
            toast.error("Erreur : Impossible de localiser la zone du document.");
            return;
        }

        try {
            toast.info("Génération du document PDF officiel...");

            // Configuration pour html2pdf
            const options = {
                margin: 0,
                filename: `Demande_Approche_N_${idDemande}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // 2. Extraire le PDF sous forme de fichier binaire brut (Blob)
            const pdfBlob = await html2pdf().from(element).set(options).output('blob');

            // 3. Préparer le tableau des prix de revient (PU Ariary) calculés en temps réel
            // On extrait les valeurs de resultatsParArticle (qui contient puAriary pour chaque article)
            const listePrixArticles = Object.keys(resultatsParArticle).map((cleId) => {
                // Si l'id contient un caractère '#' (comme pour le type Canettes "id#0"), 
                // on extrait uniquement l'identifiant numérique de base pour le Back-end
                const idNumerique = cleId.includes("#") ? parseInt(cleId.split("#")[0]) : parseInt(cleId);
                
                return {
                    articleId: idNumerique,
                    prixDeRevient: resultatsParArticle[cleId]?.puAriary || 0 // PU en Ariary calculé
                };
            });

            // 4. Encapsuler le Blob et le JSON des articles dans un objet FormData
            const formData = new FormData();
            formData.append("pdfFile", pdfBlob, `Demande_Approche_N_${idDemande}.pdf`);
            
            formData.append("articles", JSON.stringify(listePrixArticles)); // Envoi sous forme de chaîne JSON

            if (donneesInitiales?.commentaire){
                formData.append("commentaire", donneesInitiales.commentaire);
            }

            formData.append("typeDossier", dossierData.typeDossier || "");
            formData.append("immo", dossierData.immo || "");

            toast.info("Envoi de la demande et enregistrement des prix...");

            // 5. Expédition unique au service API révisé
            // Cette méthode gère l'enregistrement du PDF, des prix, et change le statut à "En cours" côté C#
            await demandeService.soumettreTraitement(idDemande, formData);
            
            // Mise à jour de l'état local du statut pour l'affichage
            setStatut("En cours");

            toast.success("🚀 Traitement enregistré et demande envoyée avec succès au validateur !");
            alert("Demande envoyée avec succès !");
            setTimeout(() => {
                navigate("/home@comptabilite");
            }, 2000);

        } catch (err) {
            console.error("Erreur lors de l'envoi :", err);
            toast.error("Une erreur est survenue lors de l'envoi.");
        }
    };

    if (loading) return <div className="text-center mt-5"><h4>Chargement de l'aperçu...</h4></div>;
    if (!dossierData) return <div className="alert alert-danger m-5">Erreur : Impossible de charger les données.</div>;

    const isCanettes = dossierData.typeDossier === "Canettes";

    const valeurs = Object.values(resultatsParArticle);

    const montantCFR = (parseFloat(dossierData.fobTotal) || 0) + (parseFloat(dossierData.mfobTotal) || 0) + (parseFloat(dossierData.fretTotal) || 0);

    const assuranceValue = (montantCFR * taux_assurance) / 100;

    const fmtDevise = (val, decimals = 4) => {
        if (!dossierData?.cours || !val) return "0";
        const valeurAr = parseFloat(val) || 0;
        const valeurDevise = valeurAr / (parseFloat(dossierData.cours) || 1);
        return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(valeurDevise);
    };

    const fmtAr = (val) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(val || 0);

    const fretValue = (parseFloat(dossierData?.mfobTotal) || 0) + (parseFloat(dossierData?.fretTotal) || 0);

    const droitEtTaxesValue = dossierData?.typeDossier === "Aériens"
        ? ( (parseFloat(dossierData?.douanes) || 0) * (parseFloat(valeurCAF) || 0) / 100 + (parseFloat(dossierData?.prestationGasyNet) || 0) + (parseFloat(dossierData?.autresDat) || 0)) / (parseFloat(dossierData?.cours) || 1)
        : ( (parseFloat(dossierData?.douanes) || 0) * (parseFloat(valeurCAF) || 0) / 100 + (parseFloat(dossierData?.prestationGasyNet) || 0) + (parseFloat(dossierData?.apmf) || 0) + (parseFloat(dossierData?.ddp) || 0) + (parseFloat(dossierData?.autresDat) || 0) + (parseFloat(dossierData?.autreFrais) || 0)) / (parseFloat(dossierData?.cours) || 1);

    const commissionValue = (parseFloat(detailFraisApproche?.commissionRemunTranslate) || 0) + (parseFloat(dossierData?.commissionBancaires) || 0);

    const deboursIvatoValue = (parseFloat(dossierData?.deboursIvato) || 0) / (parseFloat(dossierData?.cours) || 1);
    const totalHadValue = (parseFloat(dossierData?.totalHad) || 0) / (parseFloat(dossierData?.cours) || 1);
    const livraisonValue = (parseFloat(dossierData?.transportLocal) || 0) / (parseFloat(dossierData?.cours) || 1);
    const fraisArriveeValue = deboursIvatoValue + livraisonValue + totalHadValue;
    const debarquementValueNonAerien = (parseFloat(dossierData?.deboursMagasinage) || 0) / (parseFloat(dossierData?.cours) || 1) + (parseFloat(dossierData?.deboursTransit) || 0);

    const commissionValueDF = commissionValue / (parseFloat(dossierData?.cours) || 1);

    const tarifLTAValue = (parseFloat(dossierData?.tarifLTA) || 0) / (parseFloat(dossierData?.cours) || 1);

    const fretValueAvecAutreFrais = dossierData?.typeDossier === "Aériens"
        ? fretValue + (parseFloat(dossierData?.autreFrais) || 0) / (parseFloat(dossierData?.cours) || 1)
        : fretValue;

    const fraisapproche = dossierData?.typeDossier === "Aériens"
        ? fretValueAvecAutreFrais + droitEtTaxesValue + fraisArriveeValue + commissionValueDF + assuranceValue + tarifLTAValue
        : fretValue + droitEtTaxesValue + debarquementValueNonAerien + commissionValueDF + livraisonValue + assuranceValue + tarifLTAValue;
// + droitEtTaxesValue + commissionValueDF + transportLocalDF + assuranceValue
    const couttot = fraisapproche + (parseFloat(dossierData?.fobTotal))

    return (
        <div className="pdf-preview-background">
            <div className="no-print action-bar">
                <button className="btn btn-secondary btn-sm me-2" onClick={onRetour}>⬅️ Retour</button>
                <button className="btn btn-primary btn-sm me-4" onClick={handleExporterPDF}>⬇️ Télécharger le PDF</button>

                {userRole === "Validateur" && statut === "En cours" && (
                    <div className="d-inline-block border-start ps-3">
                        <span className="me-2 text-white text-sm">Décision :</span>
                        <button className="btn btn-success btn-sm me-2" onClick={() => handleChangerStatut("Validé")}>✔️ Valider</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleChangerStatut("Refusé")}>❌ Refuser</button>
                    </div>
                )}
            </div>

            <div id="zone-a4-pdf" className="page-a4">
                

                <div className="pdf-header">
                    <div className="image">
                        <img src="/image/STA_LOGO_RVB.png" alt="" srcset="" />
                    </div>
                </div>

                <div className="pdf-title-block">
                
                    {/* <h1 className="ref-text">DEM-{String(idDemande).padStart(3, '0')}</h1> */}
                  
                </div>

                {dossierData.typeDossier && dossierData.typeDossier !== "Groupage" && articles.length > 0 && (
                    <div className="pdf-lot-info mb-3">
                        {articles.map((art, idx) => (
                            <div key={art.id || idx} className="mb-1">
                                <strong>Dossier:</strong> {art.codeLot || "N/A"} &nbsp;&nbsp;
                                {/* <strong>Désignation :</strong> {art.designation || "N/A"} */}
                            </div>
                        ))}
                    </div>
                )}

               
                <table className="table-pdf mb-4">
                    <tbody>
                        <tr>
                            <td className="leaf-bold">Type de demande :</td>
                            <td>{dossierData.typeDossier || "Non défini"}</td>
                            {dossierData.typeDossier === "Aériens" ? (
                                <>
                                    <td className="leaf-bold">Compagnie:</td>
                                    <td>{dossierData.compagnie || "Non défini"}</td>
                                </>
                            ) : (
                                <>
                                    <td className="leaf-bold">Nombre TC :</td>
                                    <td>{dossierData.tc || 0}</td>
                                </>
                            )}
                        </tr>
                        <tr>
                            <td className="leaf-bold">Origine :</td>
                            <td>{dossierData.origine || "Non défini"}</td>
                            <td className="leaf-bold">Fournisseur :</td>
                            <td>{dossierData.frs || "Non défini"}</td>
                        </tr>
                        <tr>
                            <td className="leaf-bold">Usine :</td>
                            <td>{dossierData.usine || "Non défini"}</td>
                            <td className="leaf-bold">Cours :</td>
                            <td>{dossierData.cours} {dossierData.unitcours || "Non défini"}</td>
                        </tr>
                        {dossierData.typeDossier !== "Aériens" && (
                            <tr>
                                <td className="leaf-bold">Port :</td>
                                <td>{dossierData.port || "Non défini"}</td>
                            </tr>
                        )}
                        
                    </tbody>
                </table>

                <table className="table-pdf mb-4">
                    <thead>
                        <tr className="table-row-highlight">
                            <td className="w-10 leaf-bold"></td>
                            <td className="w-20 leaf-bold">Motifs</td>
                            <td className="w-20 text-end leaf-bold">Montant</td>
                            <td className="w-20 text-end leaf-bold">Taux</td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td className="w-20 leaf-bold">Montant FOB</td>
                            <td className="w-20 text-end">{fmt(parseFloat(dossierData.fobTotal) || 0)} </td>
                            <td className="text-end"></td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td className="w-20 leaf-bold">Fret</td>
                            <td className="w-20 text-end">{fmt(parseFloat(dossierData.fretTotal) || 0)} </td>
                            <td className="text-end"></td>
                        </tr>
                        <tr>
                            <td>3</td>
                            <td className="w-20 leaf-bold">Coût de mise FOB</td>
                            <td className="w-20 text-end">{fmt(parseFloat(dossierData.mfobTotal) || 0)} </td>
                            <td className="text-end"></td>
                        </tr>
                        <tr>
                            <td>4</td>
                            <td>{dossierData.typeDossier === "Aériens" ? "Autre Frais" : "Assurance (0.2% CFR)"}</td>
                            <td className="text-end">{dossierData.typeDossier === "Aériens" ? fmt((parseFloat(dossierData.autreFrais) || 0) / (parseFloat(dossierData.cours) || 1)) : fmt(assuranceValue * (parseFloat(dossierData.cours) || 1))} </td>
                            <td className="text-end">{dossierData.typeDossier === "Aériens" ? "" : (tauxAssurance).toFixed(1) + "%"}</td>
                        </tr>
                        <tr className="table-row-highlight " style={{ backgroundColor: "rgb(226, 223, 22)", fontWeight:"bold" }}>
                            <td>5</td>
                            <td>Montant CFR (1+2+3)</td>
                            <td colSpan="1" className=" text-end"><strong>{fmt(montantCFR)} </strong></td>
                            <td></td>
                        </tr>
                        <tr className="table-row-highlight " style={{ backgroundColor: "yellow" , fontWeight:"bold"}}>
                            <td>6</td>
                            <td>FRET (2+3)</td>
                            <td colSpan="1" className=" text-end"><strong>{fmt(dossierData.typeDossier === "Aériens" ? fretValueAvecAutreFrais : fretValue)} </strong></td>
                            <td></td>
                        </tr>
                        <tr>
                            <td>7</td>
                            <td>Douanes</td>
                            <td className="text-end">{fmt((parseFloat(dossierData.douanes) || 0) * (parseFloat(valeurCAF) || 0) / 100 / (parseFloat(dossierData.cours) || 1))} </td>
                            <td className="text-end">{fmt(detailFraisApproche?.pourcentdouanes || 0)} %</td>
                        </tr>
                        <tr>
                            <td>8</td>
                            <td>Prestation GasyNet</td>
                            <td className="text-end">{fmt(parseFloat(dossierData.prestationGasyNet/dossierData.cours) || 0 )} </td>
                            <td className="text-end">{fmt(detailFraisApproche?.pourcentprestationGasyNet || 0)} %</td>
                        </tr>
                        {dossierData.typeDossier !== "Aériens" && (
                            <tr>
                                <td>9</td>
                                <td>APMF</td>
                                <td className="text-end">{fmt(parseFloat(dossierData.apmf/dossierData.cours) || 0)} </td>
                                <td className="text-end"></td>
                            </tr>
                        )}
                        {dossierData.typeDossier !== "Aériens" && (
                            <tr>
                                <td>10</td>
                                <td>DDP</td>
                                <td className="text-end">{fmt(parseFloat(dossierData.ddp/dossierData.cours) || 0)} </td>
                                <td className="text-end"></td>
                            </tr>
                        )}
                        <tr>
                            <td>{dossierData.typeDossier === "Aériens" ? "10" : "11"}</td>
                            <td>{dossierData.typeDossier === "Aériens" ? "Autre taxes" : "DAT"}</td>
                            <td className="text-end">{fmt(parseFloat(dossierData.autresDat/dossierData.cours) || 0)} </td>
                            <td className="text-end"></td>
                        </tr>
                        <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>
                            <td>12</td>
                            <td>Droit&Taxes ({dossierData.typeDossier === "Aériens" ? "8+9+10" : "7+8+9+10+11"})</td>
                            <td colSpan="1" className="text-end"><strong>{fmt(droitEtTaxesValue)} </strong></td>
                            <td></td>
                        </tr>
                        {dossierData.typeDossier === "Aériens" ? (
                            <>
                                <tr>
                                    <td>13</td>
                                    <td>Debours ivato</td>
                                    <td className="text-end"><strong>{fmt(deboursIvatoValue)} </strong></td>
                                    <td className="text-end"></td>
                                </tr>
                                <tr>
                                    <td>14</td>
                                    <td>LIVRAISON</td>
                                    <td className="text-end"><strong>{fmt(livraisonValue)} </strong></td>
                                    <td className="text-end"></td>
                                </tr>
                                <tr>
                                    <td>15</td>
                                    <td>had</td>
                                    <td className="text-end"><strong>{fmt(totalHadValue)} </strong></td>
                                    <td className="text-end"></td>
                                </tr>
                                <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>
                                    <td >16</td>
                                    <td>Frais à l'arrivée(13+14+15)</td>
                                    <td className="text-end">{fmt(fraisArriveeValue)} </td>
                                    <td className="text-end"></td>
                                </tr>
                            </>
                        ) : (
                            <>
                                <tr>
                                    <td>13</td>
                                    <td>FRAIS A L'ARRIVEE</td>
                                    <td className="text-end"><strong>{fmt((dossierData.deboursTransit || 0) * (parseFloat(dossierData.cours) || 1)/dossierData.cours)} </strong></td>
                                    <td className="text-end"></td>
                                </tr>
                                <tr>
                                    <td>14</td>
                                    <td>Debours Magasinage</td>
                                    <td className="text-end"><strong>{fmt(parseFloat(dossierData.deboursMagasinage/dossierData.cours) || 0)} </strong></td>
                                    <td className="text-end"></td>
                                </tr>
                                <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>
                                    <td >15</td>
                                    <td>Débarquement(13+14)</td>
                                    <td className="text-end">{fmt(debarquementValueNonAerien)} </td>
                                    <td className="text-end"></td>
                                </tr>
                            </>
                        )}
                        <tr>
                            <td>16</td>
                            <td>Commission SACORFINA</td>
                            <td className="text-end">{fmt(parseFloat(detailFraisApproche?.commissionRemunTranslate || 0)/dossierData.cours)} </td>
                            <td className="text-end">{fmt(detailFraisApproche?.pourcentcommissionRemun || 0)} %</td>
                        </tr>
                        <tr>
                            <td>17</td>
                            <td>Commission Bancaires</td>
                            <td className="text-end">{fmt(parseFloat(dossierData.commissionBancaires/dossierData.cours) || 0)} </td>
                            <td className="text-end">{fmt(detailFraisApproche?.pourcentcommissionBancaire || 0)} %</td>
                        </tr>
                        <tr className="table-row-highlight " style={{ backgroundColor: "yellow" , fontWeight:"bold"}}>
                            <td>18</td>
                            <td>Commission (16+17)</td>
                            <td colSpan="1" className="text-end"><strong>{fmtDevise(commissionValue, 2)} </strong></td>
                            <td></td>
                        </tr>
                        {dossierData.typeDossier !== "Aériens" && (
                            <tr>
                                <td>19</td>
                                <td>Transport Local</td>
                                <td className="text-end">{fmt((parseFloat(dossierData.transportLocal/dossierData.cours) || 0) * (parseFloat(dossierData.tc) || 0))} </td>
                                <td className="text-end"></td>
                            </tr>
                        )}
                        {dossierData.typeDossier === "Aériens" && (
                            <tr>
                                <td>19</td>
                                <td>Tarif LTA</td>
                                <td className="text-end">{fmt(tarifLTAValue)} </td>
                                <td className="text-end"></td>
                            </tr>
                        )}
                        <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>
                            <td>20</td>
                            <td>Frais d'approche({dossierData.typeDossier === "Aériens" ? "4+7+11+15+19" : "4+6+12+15+18+19"})</td>
                            <td colSpan="1" className="text-end"><strong>{fmt(fraisapproche)} </strong></td>
                            <td></td>
                        </tr>
                        <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>
                            <td>21</td>
                            <td>Coût Total (1+20)</td>
                            <td colSpan="1" className="text-end"><strong>{fmt(couttot)} </strong></td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <table className="table-articles">
                    <thead>
                        <tr>
                            <th>Dossier</th>
                            <th>Article</th>
                            {/* {isCanettes && <th>Type</th>} */}
                            <th>Code IMMO</th>
                            <th className="text-end">Quantité</th>
                            <th className="text-end">Unité</th>
                            <th className="text-end">PU FOB (1/Quantité)</th>
                            <th className="text-end">PU DDP (19/Quantité)</th>
                            <th className="text-end">PU en Ariary (Ar)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {valeurs.map((art, index) => {
                            let libelleType = "";
                            if (isCanettes && typeof art.id === "string") {
                                if (art.id.endsWith("#0")) libelleType = "Couvercle";
                                else if (art.id.endsWith("#1")) libelleType = "Boîte";
                            }
                            const pufob = (parseFloat(dossierData?.fobTotal) || 0) / (parseFloat(art.quantite) || 1);
                            const puddp = (couttot) / (parseFloat(art.quantite) || 1);
                            return (
                            <tr key={art.id || index}>
                                <td>{art.codeLot}</td>
                                <td>{art.designation} {isCanettes && {libelleType}}</td>
                                
                                <td>{art.immo}</td>
                                {/* <td className="text-end">{fmt(art.prixUnitaire || 0)} </td> */}
                                <td className="text-end">{art.quantite || 0}</td>
                                <td className="text-end">{art.unite || "Kg"}</td>
                                <td className="text-end font-monospace-bold">{fmt(pufob)} </td>
                                <td className="text-end font-monospace-bold">{fmt(puddp)} </td>
                                <td className="text-end font-monospace-bold">{fmt(art.puAriary)} Ar</td>
                            </tr>
                            );
                        })}
                    </tbody>
                    
                </table>

                {donneesInitiales?.commentaire && (
                    <div className="commentaire-section" style={{display:"none"}}>
                        <strong>Commentaire :</strong>
                        <p>{donneesInitiales.commentaire}</p>
                    </div>
                )}

                <div className="signature-section">
                   
                    <div className="sign-box  text-end" >
                        
                        {statut !== "En cours" && <span className="sign-statut-text text-end">Dossier {statut} le {new Date().toLocaleDateString()}</span>}
                    </div>
                </div>
            </div>

            {userRole === "Demandeur" && (
                <div className="text-end mt-4 no-print">
                    <button className="btn btn-secondary me-2" onClick={onRetour}>
                        Modifier les saisies
                    </button>
                    <button className="btn btn-success" onClick={handleEnvoyerOfficiel}>
                        🚀 Envoyer définitivement
                    </button>
                </div>
            )}
        </div>
    );
}