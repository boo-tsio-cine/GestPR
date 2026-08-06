warning: in the working copy of 'Frontend/src/components/comptabilite/comptabilite.jsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'Frontend/src/components/comptabilite/traitement/PageApercuDemande.jsx', LF will be replaced by CRLF the next time Git touches it
[1mdiff --git a/Frontend/src/components/comptabilite/comptabilite.css b/Frontend/src/components/comptabilite/comptabilite.css[m
[1mindex 1340cb4..0854a97 100644[m
[1m--- a/Frontend/src/components/comptabilite/comptabilite.css[m
[1m+++ b/Frontend/src/components/comptabilite/comptabilite.css[m
[36m@@ -26,6 +26,7 @@[m
     border-radius: 10px;[m
     overflow: hidden;[m
     /* box-shadow: 4px 4px rgb(197, 1, 1); */[m
[32m+[m[32m    border: .2px solid rgb(189, 189, 189);;[m
 }[m
 .title{[m
     text-align: center;[m
[36m@@ -52,6 +53,7 @@[m
     border: 1px solid rgb(219, 205, 205);[m
     border-radius: 0 0 10px 10px;[m
     padding: 1rem;[m
[32m+[m[32m    margin-top: 5rem;[m
 } [m
 [m
 .card-site{[m
[36m@@ -77,3 +79,25 @@[m
     top: 0; [m
 }[m
 [m
[32m+[m[32m/* Définition des propriétés de base de la boîte de dialogue */[m
[32m+[m[32m.fiche-dialog {[m
[32m+[m[32m    width: 96vw;[m
[32m+[m[32m    height: 96vh;[m
[32m+[m[32m    border: none;[m
[32m+[m[32m    border-radius: 8px;[m
[32m+[m[32m    padding: 20px;[m
[32m+[m[32m    box-sizing: border-box;[m
[32m+[m[32m    /* Suppression des propriétés d'affichage inline bloquantes */[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m/* Le modèle Flexbox s'applique uniquement à l'ouverture du dialogue */[m
[32m+[m[32m.fiche-dialog[open] {[m
[32m+[m[32m    display: flex;[m
[32m+[m[32m    flex-direction: column;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m/* Style de l'arrière-plan d'occultation natif */[m
[32m+[m[32m.fiche-dialog::backdrop {[m
[32m+[m[32m    background-color: rgba(0, 0, 0, 0.6);[m
[32m+[m[32m    backdrop-filter: blur(5px);[m
[32m+[m[32m}[m
\ No newline at end of file[m
[1mdiff --git a/Frontend/src/components/comptabilite/comptabilite.jsx b/Frontend/src/components/comptabilite/comptabilite.jsx[m
[1mindex cfe2f7f..2e24b80 100644[m
[1m--- a/Frontend/src/components/comptabilite/comptabilite.jsx[m
[1m+++ b/Frontend/src/components/comptabilite/comptabilite.jsx[m
[36m@@ -1,5 +1,6 @@[m
[31m-import { useEffect, useMemo, useState } from "react";[m
[32m+[m[32mimport { useEffect, useMemo, useRef, useState } from "react";[m
 import { articleService, demandeService, userService } from "../../services/api";[m
[32m+[m[32mimport api from "../../services/api";[m
 import CrudPage from "../../page/crud_page";[m
 import { Card, CardContent, CardHeader } from "../ui/Cards";[m
 import Input from "../ui/input";[m
[36m@@ -12,7 +13,6 @@[m [mimport "./comptabilite.css";[m
 import { Link } from "react-router-dom";[m
 [m
 [m
[31m-[m
 function Comptabilite(){[m
 [m
     const [loading, setLoading] = useState(true);[m
[36m@@ -54,6 +54,7 @@[m [mfunction Comptabilite(){[m
                     status: d.status ?? d.Status ?? "Nouvelle",[m
                     date: d.dateTime ?? d.DateTime,[m
                     demandeurId: idDuDemandeur,[m
[32m+[m[32m                    pdfFileName: d.pdfFileName ?? d.PdfFileName ?? d.pdf ?? d.Pdf ?? "",[m
 [m
                     site: utilisateurTrouve ? (utilisateurTrouve.site || utilisateurTrouve.Site || "") : "",[m
 [m
[36m@@ -96,7 +97,6 @@[m [mfunction Comptabilite(){[m
 [m
 [m
 [m
[31m-[m
     const demandesFiltrees = useMemo(() => {[m
             let result = demande.filter((d) => {[m
                 const matchDate = !filtrerDate || d.date?.slice(0, 10) === filtrerDate;[m
[36m@@ -204,99 +204,200 @@[m [mfunction Comptabilite(){[m
     </>[m
 }[m
 [m
[31m-function DemandesTable({ data, empty }) {[m
[32m+[m[32mfunction DemandesTable({ data, empty, onDetail }) {[m
[32m+[m[32m    const [selectedDemande, setSelectedDemande] = useState(null);[m
[32m+[m[32m    const [currentPdfUrl, setCurrentPdfUrl] = useState("");[m
[32m+[m[32m    const [pdfFileName, setPdfFileName] = useState("");[m
[32m+[m[32m    const [motif, setMotif] = useState("");[m
[32m+[m[32m    const dialogRef = useRef(null);[m
[32m+[m
[32m+[m[32m    const ouvrirDialog = async (d) => {[m
[32m+[m[32m        setSelectedDemande(d);[m
[32m+[m[32m        setMotif(d.motif || "");[m
[32m+[m[32m        setPdfFileName(d.pdfFileName || "");[m
[32m+[m
[32m+[m[32m        if (d.pdfFileName) {[m
[32m+[m[32m            try {[m
[32m+[m[32m                const response = await api.get(`/demandes/${d.id}/pdf`, {[m
[32m+[m[32m                    responseType: "blob",[m
[32m+[m[32m                });[m
[32m+[m
[32m+[m[32m                const blob = new Blob([response.data], { type: "application/pdf" });[m
[32m+[m[32m                const url = URL.createObjectURL(blob);[m
[32m+[m[32m                setCurrentPdfUrl(url);[m
[32m+[m[32m            } catch (err) {[m
[32m+[m[32m                console.error("Erreur de chargement du PDF via l'API:", err);[m
[32m+[m[32m                setCurrentPdfUrl("");[m
[32m+[m[32m                toast.error("Impossible de charger le document PDF.");[m
[32m+[m[32m            }[m
[32m+[m[32m        } else {[m
[32m+[m[32m            setCurrentPdfUrl("");[m
[32m+[m[32m        }[m
[32m+[m
[32m+[m[32m        requestAnimationFrame(() => {[m
[32m+[m[32m            dialogRef.current?.showModal();[m
[32m+[m[32m        });[m
[32m+[m[32m    };[m
[32m+[m
[32m+[m[32m    const fermerDialog = () => {[m
[32m+[m[32m        if (currentPdfUrl && currentPdfUrl.startsWith("blob:")) {[m
[32m+[m[32m            URL.revokeObjectURL(currentPdfUrl);[m
[32m+[m[32m        }[m
[32m+[m[32m        dialogRef.current?.close();[m
[32m+[m[32m        setSelectedDemande(null);[m
[32m+[m[32m        setCurrentPdfUrl("");[m
[32m+[m[32m        setPdfFileName("");[m
[32m+[m[32m        setMotif("");[m
[32m+[m[32m    };[m
[32m+[m
[32m+[m[32m    const telechargerPdf = () => {[m
[32m+[m[32m        if (!currentPdfUrl || !pdfFileName) return;[m
[32m+[m
[32m+[m[32m        const a = document.createElement("a");[m
[32m+[m[32m        a.href = currentPdfUrl;[m
[32m+[m[32m        a.download = pdfFileName;[m
[32m+[m[32m        document.body.appendChild(a);[m
[32m+[m[32m        a.click();[m
[32m+[m[32m        document.body.removeChild(a);[m
[32m+[m[32m    };[m
[32m+[m
     if (data.length === 0) {[m
         return <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>;[m
     }[m
[32m+[m
     const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };[m
[31m-    const date= new Date().toLocaleDateString('fr-FR', options)[m
[32m+[m[32m    const date = new Date().toLocaleDateString('fr-FR', options);[m
[32m+[m
     return ([m
[31m-        [m
[31m-        <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ">[m
[31m-            <div className="title">[m
[31m-                Demande à traiter[m
[31m-            </div>[m
[31m-            {data.map((d) => ([m
[31m-                // const idFormate = String(d.id).padStart(3, '0');[m
[31m-[m
[31m-                <div className=" card-dem" key = {d.id}>[m
[31m-                    <div className="card-head">[m
[31m-                        <time>{d.date ? new Date(d.date).toLocaleDateString('fr-FR') : "Date inconnue"}</time>[m
[31m-                        <div>DEM-[m
[31m-                            {   d.id < 10 [m
[31m-                                ? `00${d.id}` [m
[31m-                                : d.id < 100 [m
[31m-                                    ? `0${d.id}` [m
[31m-                                    : d.id[m
[31m-                            }[m
[31m-                        </div>[m
[31m-                        <data[m
[31m-                            value="completed"[m
[31m-                            className="status-badge"[m
[31m-                            style={{[m
[31m-                                backgroundColor: d.status === "Nouvelle" ? "#a9caf5" : d.status === "En attente" ? "#FEF9C3" : d.status === "Validée" ? "#DCFCE7" : "#FFE4E6",[m
[31m-                                color: d.status === "Nouvelle" ? "#000927" : d.status === "En attente" ? "#854D0E" : d.status === "Validée" ? "#166534" : "#9F1239",[m
[31m-                                width:'8rem',[m
[31m-                                height:'100%',[m
[31m-                                borderRadius:'5px',[m
[31m-                                textAlign:'center'[m
[31m-                            }}[m
[31m-                        >{d.status}</data>[m
[31m-                    </div>[m
[31m-                    <div className="card-desc">[m
[31m-                        [m
[31m-                        <div className="card-site">[m
[31m-                            <div>{d.site || "Site inconnu"}</div>[m
[31m-                        </div>[m
[31m-                        <div className="card-id">[m
[31m-                            <p>{d.nomDemandeur} {d.prenomDemandeur}</p>[m
[31m-                            <p>{d.matricule}</p>[m
[32m+[m[32m        <>[m
[32m+[m[32m            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ">[m
[32m+[m[32m                <div className="title">[m
[32m+[m[32m                    Demande à traiter[m
[32m+[m[32m                </div>[m
[32m+[m[32m                {data.map((d) => ([m
[32m+[m[32m                    <div className=" card-dem" key={d.id}>[m
[32m+[m[32m                        <div className="card-head">[m
[32m+[m[32m                            <time>{d.date ? new Date(d.date).toLocaleDateString('fr-FR') : "Date inconnue"}</time>[m
[32m+[m[32m                            <div>DEM-[m
[32m+[m[32m                                {d.id < 10[m[41m [m
[32m+[m[32m                                    ? `00${d.id}`[m[41m [m
[32m+[m[32m                                    : d.id < 100[m[41m [m
[32m+[m[32m                                        ? `0${d.id}`[m[41m [m
[32m+[m[32m                                        : d.id}[m
[32m+[m[32m                            </div>[m
[32m+[m[32m                            <data[m
[32m+[m[32m                                value="completed"[m
[32m+[m[32m                                className="status-badge"[m
[32m+[m[32m                                style={{[m
[32m+[m[32m                                    backgroundColor: d.status === "Nouvelle" ? "#a9caf5" : d.status === "En attente" ? "#FEF9C3" : d.status === "Validée" ? "#DCFCE7" : "#FFE4E6",[m
[32m+[m[32m                                    color: d.status === "Nouvelle" ? "#000927" : d.status === "En attente" ? "#854D0E" : d.status === "Validée" ? "#166534" : "#9F1239",[m
[32m+[m[32m                                    width:'8rem',[m
[32m+[m[32m                                    height:'100%',[m
[32m+[m[32m                                    borderRadius:'5px',[m
[32m+[m[32m                                    textAlign:'center'[m
[32m+[m[32m                                }}[m
[32m+[m[32m                            >{d.status}</data>[m
                         </div>[m
[31m-                        <div className="card-table">[m
[31m-                            <div className="w-full overflow-hidden rounded-xl  border-gray-200 bg-white shadow-sm">[m
[31m-                                <Table className="table">[m
[31m-                                    [m
[31m-                                    <TableBody className="divide-y divide-gray-100">[m
[31m-                                        {[m
[31m-                                            d.lots && d.lots.length > 0 ? ([m
[32m+[m[32m                        <div className="card-desc">[m
[32m+[m[32m                            <div className="card-site">[m
[32m+[m[32m                                <div>{d.site || "Site inconnu"}</div>[m
[32m+[m[32m                            </div>[m
[32m+[m[32m                            <div className="card-id">[m
[32m+[m[32m                                <p>{d.nomDemandeur} {d.prenomDemandeur}</p>[m
[32m+[m[32m                                <p>{d.matricule}</p>[m
[32m+[m[32m                            </div>[m
[32m+[m[32m                            <div className="card-table">[m
[32m+[m[32m                                <div className="w-full overflow-hidden rounded-xl border-gray-200 bg-white shadow-sm">[m
[32m+[m[32m                                    <Table className="table">[m
[32m+[m[32m                                        <TableBody className="divide-y divide-gray-100">[m
[32m+[m[32m                                            {d.lots && d.lots.length > 0 ? ([m
                                                 d.lots.map((article) => ([m
[31m-                                                    // Toujours fournir une clé unique 'key' lors d'un .map() dans React[m
                                                     <TableRow key={article.id} className="transition-colors hover:bg-gray-50">[m
                                                         <TableCell className="px-4 py-3 text-sm text-gray-600">[m
                                                             {article.codeLot}[m
                                                         </TableCell>[m
[31m-                                                        [m
                                                         <TableCell className="px-4 py-3 status">[m
                                                             {article.designation}[m
                                                         </TableCell>[m
                                                     </TableRow>[m
                                                 ))[m
                                             ) : ([m
[31m-                                                // Message si la demande n'a mystérieusement aucun article[m
[31m-                                            <TableRow>[m
[31m-                                                <TableCell colSpan={2} className="px-4 py-3 text-sm text-center text-gray-400">[m
[31m-                                                    Aucun article pour cette demande[m
[31m-                                                </TableCell>[m
[31m-                                            </TableRow>[m
[31m-                                            )[m
[31m-                                        }[m
[31m-                                    </TableBody>[m
[31m-                                </Table>[m
[32m+[m[32m                                                <TableRow>[m
[32m+[m[32m                                                    <TableCell colSpan={2} className="px-4 py-3 text-sm text-center text-gray-400">[m
[32m+[m[32m                                                        Aucun article pour cette demande[m
[32m+[m[32m                                                    </TableCell>[m
[32m+[m[32m                                                </TableRow>[m
[32m+[m[32m                                            )}[m
[32m+[m[32m                                        </TableBody>[m
[32m+[m[32m                                    </Table>[m
[32m+[m[32m                                </div>[m
[32m+[m[32m                            </div>[m
[32m+[m[32m                            <div className="card-link">[m
[32m+[m[32m                                {d.status === "Nouvelle" ? ([m
[32m+[m[32m                                    <Link className="btn btn-success text-white" to={`/traiter-demande/${d.id}`} style={{ display:'inline-block', textDecoration:'none'}}>[m
[32m+[m[32m                                        Traiter la demande[m
[32m+[m[32m                                    </Link>[m
[32m+[m[32m                                ) : ([m
[32m+[m[32m                                    <button[m[41m [m
[32m+[m[32m                                        className="btn text-white"[m
[32m+[m[32m                                        onClick={() => ouvrirDialog(d)}[m
[32m+[m[32m                                        style={{[m[41m [m
[32m+[m[32m                                            display:'inline-block',[m[41m [m
[32m+[m[32m                                            textDecoration:'none',[m
[32m+[m[32m                                            background:'rgb(114, 157, 165)',[m
[32m+[m[32m                                            border: 'none',[m
[32m+[m[32m                                            padding: '10px 18px',[m
[32m+[m[32m                                            borderRadius: '4px',[m
[32m+[m[32m                                            cursor: 'pointer'[m
[32m+[m[32m                                        }}[m
[32m+[m[32m                                    >[m
[32m+[m[32m                                        Voir la fiche[m[41m [m
[32m+[m[32m                                    </button>[m
[32m+[m[32m                                )}[m
                             </div>[m
                         </div>[m
[31m-                        <div className="card-link">[m
[31m-                            {d.status === "Nouvelle" && ([m
[31m-                                <Link className="btn btn-success text-white" to={`/traiter-demande/${d.id}`} style={{ display:'inline-block', textDecoration:'none'}}>[m
[31m-                                    Traiter la demande[m
[31m-                                </Link>[m
[32m+[m[32m                    </div>[m
[32m+[m[32m                ))}[m
[32m+[m[32m            </div>[m
[32m+[m
[32m+[m[32m            <dialog[m[41m [m
[32m+[m[32m                ref={dialogRef}[m[41m [m
[32m+[m[32m               className="fiche-dialog"[m
[32m+[m[32m            >[m
[32m+[m[32m                {selectedDemande && ([m
[32m+[m[32m                    <>[m
[32m+[m[32m                        <div className="d-flex justify-content-between align-items-center mb-2">[m
[32m+[m[32m                            <h5 className="m-0">Traitement de la demande DEM-{String(selectedDemande.id).padStart(3, '0')}</h5>[m
[32m+[m[32m                            <div className="d-flex gap-2">[m
[32m+[m[32m                                {currentPdfUrl && ([m
[32m+[m[32m                                    <button[m[41m [m
[32m+[m[32m                                        className="btn btn-success btn-sm"[m
[32m+[m[32m                                        onClick={telechargerPdf}[m
[32m+[m[32m                                        title="Télécharger le PDF"[m
[32m+[m[32m                                    >[m
[32m+[m[32m                                        📥 Télécharger[m
[32m+[m[32m                                    </button>[m
[32m+[m[32m                                )}[m
[32m+[m[32m                                <button className="btn btn-close" onClick={fermerDialog}></button>[m
[32m+[m[32m                            </div>[m
[32m+[m[32m                        </div>[m
[32m+[m[41m                        [m
[32m+[m[32m                        <div className="mb-2" style={{ flex: 1, minHeight: 0 }}>[m
[32m+[m[32m                            {currentPdfUrl ? ([m
[32m+[m[32m                                <iframe[m[41m [m
[32m+[m[32m                                    key={currentPdfUrl}[m
[32m+[m[32m                                    src={currentPdfUrl}[m[41m [m
[32m+[m[32m                                    style={{ width: '100%', height: '100%', border: 'none' }}[m
[32m+[m[32m                                    title="Aperçu PDF"[m
[32m+[m[32m                                />[m
[32m+[m[32m                            ) : ([m
[32m+[m[32m                                <div className="alert alert-warning">Aucun document PDF disponible pour cette demande.</div>[m
                             )}[m
                         </div>[m
[31m-                    </div>[m
[31m-                </div>[m
[31m-                ))[m
[31m-            }[m
[31m-          [m
[31m-        </div>[m
[32m+[m[32m                    </>[m
[32m+[m[32m                )}[m
[32m+[m[32m            </dialog>[m
[32m+[m[32m        </>[m
     );[m
 }[m
 [m
[1mdiff --git a/Frontend/src/components/comptabilite/traitement/PageApercuDemande.jsx b/Frontend/src/components/comptabilite/traitement/PageApercuDemande.jsx[m
[1mindex 894c94d..561a49a 100644[m
[1m--- a/Frontend/src/components/comptabilite/traitement/PageApercuDemande.jsx[m
[1m+++ b/Frontend/src/components/comptabilite/traitement/PageApercuDemande.jsx[m
[36m@@ -29,7 +29,7 @@[m [mfunction calcPartProrata(montantGlobal, proportion) {[m
     return (total * proportion) / 100;[m
 }[m
 [m
[31m-function fmt(n, decimals = 4) {[m
[32m+[m[32mfunction fmt(n, decimals = 2) {[m
     if (!isFinite(n)) return "0";[m
     return new Intl.NumberFormat("fr-FR", {[m
         minimumFractionDigits: decimals,[m
[36m@@ -267,6 +267,9 @@[m [mexport default function PageApercuDemande({idDemande, userRole = "Demandeur", on[m
                 formData.append("commentaire", donneesInitiales.commentaire);[m
             }[m
 [m
[32m+[m[32m            formData.append("typeDossier", dossierData.typeDossier || "");[m
[32m+[m[32m            formData.append("immo", dossierData.immo || "");[m
[32m+[m
             toast.info("Envoi de la demande et enregistrement des prix...");[m
 [m
             // 5. Expédition unique au service API révisé[m
[36m@@ -299,25 +302,41 @@[m [mexport default function PageApercuDemande({idDemande, userRole = "Demandeur", on[m
 [m
     const assuranceValue = (montantCFR * taux_assurance) / 100;[m
 [m
[31m-    const fmtDevise = (val) => {[m
[32m+[m[32m    const fmtDevise = (val, decimals = 4) => {[m
         if (!dossierData?.cours || !val) return "0";[m
         const valeurAr = parseFloat(val) || 0;[m
         const valeurDevise = valeurAr / (parseFloat(dossierData.cours) || 1);[m
[31m-        return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(valeurDevise);[m
[32m+[m[32m        return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(valeurDevise);[m
     };[m
 [m
     const fmtAr = (val) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(val || 0);[m
 [m
     const fretValue = (parseFloat(dossierData?.mfobTotal) || 0) + (parseFloat(dossierData?.fretTotal) || 0);[m
[31m-    const droitEtTaxesValue = ((parseFloat(dossierData?.douanes) || 0) + (parseFloat(dossierData?.prestationGasyNet) || 0) + (parseFloat(dossierData?.apmf) || 0) + (parseFloat(dossierData?.ddp) || 0)) / (parseFloat(dossierData?.cours) || 1);[m
[31m-    const commissionValue = ((parseFloat(dossierData?.debarquementValue) || 0) + (parseFloat(dossierData?.deboursMagasinage) || 0)) + ((parseFloat(dossierData?.commissionRemun) || 0) + (parseFloat(dossierData?.commissionBancaires) || 0)) + parseFloat(dossierData?.deboursTransit || 0);[m
[31m-    [m
[32m+[m
[32m+[m[32m    const droitEtTaxesValue = dossierData?.typeDossier === "Aériens"[m
[32m+[m[32m        ? ( (parseFloat(dossierData?.douanes) || 0) * (parseFloat(valeurCAF) || 0) / 100 + (parseFloat(dossierData?.prestationGasyNet) || 0) + (parseFloat(dossierData?.autresDat) || 0)) / (parseFloat(dossierData?.cours) || 1)[m
[32m+[m[32m        : ( (parseFloat(dossierData?.douanes) || 0) * (parseFloat(valeurCAF) || 0) / 100 + (parseFloat(dossierData?.prestationGasyNet) || 0) + (parseFloat(dossierData?.apmf) || 0) + (parseFloat(dossierData?.ddp) || 0) + (parseFloat(dossierData?.autresDat) || 0) + (parseFloat(dossierData?.autreFrais) || 0)) / (parseFloat(dossierData?.cours) || 1);[m
[32m+[m
[32m+[m[32m    const commissionValue = (parseFloat(detailFraisApproche?.commissionRemunTranslate) || 0) + (parseFloat(dossierData?.commissionBancaires) || 0);[m
[32m+[m
[32m+[m[32m    const deboursIvatoValue = (parseFloat(dossierData?.deboursIvato) || 0) / (parseFloat(dossierData?.cours) || 1);[m
[32m+[m[32m    const totalHadValue = (parseFloat(dossierData?.totalHad) || 0) / (parseFloat(dossierData?.cours) || 1);[m
[32m+[m[32m    const livraisonValue = (parseFloat(dossierData?.transportLocal) || 0) / (parseFloat(dossierData?.cours) || 1);[m
[32m+[m[32m    const fraisArriveeValue = deboursIvatoValue + livraisonValue + totalHadValue;[m
[32m+[m[32m    const debarquementValueNonAerien = (parseFloat(dossierData?.deboursMagasinage) || 0) / (parseFloat(dossierData?.cours) || 1) + (parseFloat(dossierData?.deboursTransit) || 0);[m
 [m
     const commissionValueDF = commissionValue / (parseFloat(dossierData?.cours) || 1);[m
[31m-    const transportLocalDF = (parseFloat(dossierData?.transportLocal) || 0) / (parseFloat(dossierData?.cours) || 1);[m
 [m
[31m-    const fraisapproche = fretValue + droitEtTaxesValue + commissionValueDF + transportLocalDF + assuranceValue;[m
[32m+[m[32m    const tarifLTAValue = (parseFloat(dossierData?.tarifLTA) || 0) / (parseFloat(dossierData?.cours) || 1);[m
 [m
[32m+[m[32m    const fretValueAvecAutreFrais = dossierData?.typeDossier === "Aériens"[m
[32m+[m[32m        ? fretValue + (parseFloat(dossierData?.autreFrais) || 0) / (parseFloat(dossierData?.cours) || 1)[m
[32m+[m[32m        : fretValue;[m
[32m+[m
[32m+[m[32m    const fraisapproche = dossierData?.typeDossier === "Aériens"[m
[32m+[m[32m        ? fretValueAvecAutreFrais + droitEtTaxesValue + fraisArriveeValue + commissionValueDF + assuranceValue + tarifLTAValue[m
[32m+[m[32m        : fretValue + droitEtTaxesValue + debarquementValueNonAerien + commissionValueDF + livraisonValue + assuranceValue + tarifLTAValue;[m
[32m+[m[32m// + droitEtTaxesValue + commissionValueDF + transportLocalDF + assuranceValue[m
     const couttot = fraisapproche + (parseFloat(dossierData?.fobTotal))[m
 [m
     return ([m
[36m@@ -367,8 +386,17 @@[m [mexport default function PageApercuDemande({idDemande, userRole = "Demandeur", on[m
                         <tr>[m
                             <td className="leaf-bold">Type de demande :</td>[m
                             <td>{dossierData.typeDossier || "Non défini"}</td>[m
[31m-                            <td className="leaf-bold">Nombre TC :</td>[m
[31m-                            <td>{dossierData.tc || 0}</td>[m
[32m+[m[32m                            {dossierData.typeDossier === "Aériens" ? ([m
[32m+[m[32m                                <>[m
[32m+[m[32m                                    <td className="leaf-bold">Compagnie:</td>[m
[32m+[m[32m                                    <td>{dossierData.compagnie || "Non défini"}</td>[m
[32m+[m[32m                                </>[m
[32m+[m[32m                            ) : ([m
[32m+[m[32m                                <>[m
[32m+[m[32m                                    <td className="leaf-bold">Nombre TC :</td>[m
[32m+[m[32m                                    <td>{dossierData.tc || 0}</td>[m
[32m+[m[32m                                </>[m
[32m+[m[32m                            )}[m
                         </tr>[m
                         <tr>[m
                             <td className="leaf-bold">Origine :</td>[m
[36m@@ -377,15 +405,17 @@[m [mexport default function PageApercuDemande({idDemande, userRole = "Demandeur", on[m
                             <td>{dossierData.frs || "Non défini"}</td>[m
                         </tr>[m
                         <tr>[m
[31m-                            <td className="leaf-bold">Port :</td>[m
[31m-                            <td>{dossierData.port || "Non défini"}</td>[m
                             <td className="leaf-bold">Usine :</td>[m
                             <td>{dossierData.usine || "Non défini"}</td>[m
[31m-                        </tr>[m
[31m-                        <tr>[m
                             <td className="leaf-bold">Cours :</td>[m
[31m-                            <td>{dossierData.unitcours || "Non défini"}</td>[m
[31m-                       </tr>[m
[32m+[m[32m                            <td>{dossierData.cours} {dossierData.unitcours || "Non défini"}</td>[m
[32m+[m[32m                        </tr>[m
[32m+[m[32m                        {dossierData.typeDossier !== "Aériens" && ([m
[32m+[m[32m                            <tr>[m
[32m+[m[32m                                <td className="leaf-bold">Port :</td>[m
[32m+[m[32m                                <td>{dossierData.port || "Non défini"}</td>[m
[32m+[m[32m                            </tr>[m
[32m+[m[32m                        )}[m
                         [m
                     </tbody>[m
                 </table>[m
[36m@@ -394,120 +424,182 @@[m [mexport default function PageApercuDemande({idDemande, userRole = "Demandeur", on[m
                     <thead>[m
                         <tr className="table-row-highlight">[m
                             <td className="w-10 leaf-bold"></td>[m
[31m-                            <td className="w-20 leaf-bold">Mptifs</td>[m
[31m-                            <td className="w-20 text-end leaf-bold">Taux</td>[m
[32m+[m[32m                            <td className="w-20 leaf-bold">Motifs</td>[m
                             <td className="w-20 text-end leaf-bold">Montant</td>[m
[32m+[m[32m                            <td className="w-20 text-end leaf-bold">Taux</td>[m
                         </tr>[m
                     </thead>[m
                     <tbody>[m
                         <tr>[m
                             <td>1</td>[m
                             <td className="w-20 leaf-bold">Montant FOB</td>[m
[31m-                            <td className="text-end">—</td>[m
[31m-                            <td className="w-20 text-end">{fmt(dossierData.fobTotal)} </td>[m
[32m+[m[32m                            <td className="w-20 text-end">{fmt(parseFloat(dossierData.fobTotal) || 0)} </td>[m
[32m+[m[32m                            <td className="text-end"></td>[m
                         </tr>[m
                         <tr>[m
                             <td>2</td>[m
                             <td className="w-20 leaf-bold">Fret</td>[m
[31m-                            <td className="text-end">—</td>[m
[31m-                            <td className="w-20 text-end">{fmt(dossierData.fretTotal)} </td>[m
[32m+[m[32m                            <td className="w-20 text-end">{fmt(parseFloat(dossierData.fretTotal) || 0)} </td>[m
[32m+[m[32m                            <td className="text-end"></td>[m
                         </tr>[m
                         <tr>[m
                             <td>3</td>[m
                             <td className="w-20 leaf-bold">Coût de mise FOB</td>[m
[31m-                            <td className="text-end">—</td>[m
[31m-                            <td className="w-20 text-end">{fmt(dossierData.mfobTotal)} </td>[m
[32m+[m[32m                            <td className="w-20 text-end">{fmt(parseFloat(dossierData.mfobTotal) || 0)} </td>[m
[32m+[m[32m                            <td className="text-end"></td>[m
                         </tr>[m
[31m-                         <tr className="table-row-highlight " style={{ backgroundColor: "yellow" , fontWeight:"bold"}}>[m
[32m+[m[32m                        <tr>[m
                             <td>4</td>[m
[31m-                            <td>Assurance (0.2% CFR)</td>[m
[31m-                            <td className="text-end">{(tauxAssurance * 100).toFixed(1)}%</td>[m
[31m-                            <td colSpan="2" className="text-end"><strong>{fmtDevise(assuranceValue * (parseFloat(dossierData.cours) || 1))} </strong></td>[m
[32m+[m[32m                            <td>{dossierData.typeDossier === "Aériens" ? "Autre Frais" : "Assurance (0.2% CFR)"}</td>[m
[32m+[m[32m                            <td className="text-end">{dossierData.typeDossier === "Aériens" ? fmt((parseFloat(dossierData.autreFrais) || 0) / (parseFloat(dossierData.cours) || 1)) : fmt(assuranceValue * (parseFloat(dossierData.cours) || 1))} </td>[m
[32m+[m[32m                            <td className="text-end">{dossierData.typeDossier === "Aériens" ? "" : (tauxAssurance).toFixed(1) + "%"}</td>[m
                         </tr>[m
                         <tr className="table-row-highlight " style={{ backgroundColor: "rgb(226, 223, 22)", fontWeight:"bold" }}>[m
                             <td>5</td>[m
                             <td>Montant CFR (1+2+3)</td>[m
[31m-                            <td colSpan="2" className=" text-end"><strong>{fmt(montantCFR)} </strong></td>[m
[32m+[m[32m                            <td colSpan="1" className=" text-end"><strong>{fmt(montantCFR)} </strong></td>[m
[32m+[m[32m                            <td></td>[m
                         </tr>[m
                         <tr className="table-row-highlight " style={{ backgroundColor: "yellow" , fontWeight:"bold"}}>[m
                             <td>6</td>[m
                             <td>FRET (2+3)</td>[m
[31m-                            <td colSpan="2" className=" text-end"><strong>{fmt(fretValue)} </strong></td>[m
[32m+[m[32m                            <td colSpan="1" className=" text-end"><strong>{fmt(dossierData.typeDossier === "Aériens" ? fretValueAvecAutreFrais : fretValue)} </strong></td>[m
[32m+[m[32m                            <td></td>[m
                         </tr>[m
                         <tr>[m
                             <td>7</td>[m
                             <td>Douanes</td>[m
[32m+[m[32m                            <td className="text-end">{fmt((parseFloat(dossierData.douanes) || 0) * (parseFloat(valeurCAF) || 0) / 100 / (parseFloat(dossierData.cours) || 1))} </td>[m
                             <td className="text-end">{fmt(detailFraisApproche?.pourcentdouanes || 0)} %</td>[m
[31m-                            <td className="text-end">{fmtDevise(dossierData.douanes)} </td>[m
                         </tr>[m
                         <tr>[m
                             <td>8</td>[m
                             <td>Prestation GasyNet</td>[m
[32m+[m[32m                            <td className="text-end">{fmt(parseFloat(dossierData.prestationGasyNet/dossierData.cours) || 0 )} </td>[m
                             <td className="text-end">{fmt(detailFraisApproche?.pourcentprestationGasyNet || 0)} %</td>[m
[31m-                            <td className="text-end">{fmtDevise(dossierData.prestationGasyNet)} </td>[m
[31m-                        </tr>[m
[31m-                        <tr>[m
[31m-                            <td>9</td>[m
[31m-                            <td>APMF</td>[m
[31m-                            <td className="text-end">—</td>[m
[31m-                            <td className="text-end">{fmtDevise(dossierData.apmf)} </td>[m
                         </tr>[m
[32m+[m[32m                        {dossierData.typeDossier !== "Aériens" && ([m
[32m+[m[32m                            <tr>[m
[32m+[m[32m                                <td>9</td>[m
[32m+[m[32m                                <td>APMF</td>[m
[32m+[m[32m                                <td className="text-end">{fmt(parseFloat(dossierData.apmf/dossierData.cours) || 0)} </td>[m
[32m+[m[32m                                <td className="text-end"></td>[m
[32m+[m[32m                            </tr>[m
[32m+[m[32m                        )}[m
[32m+[m[32m                        {dossierData.typeDossier !== "Aériens" && ([m
[32m+[m[32m                            <tr>[m
[32m+[m[32m                                <td>10</td>[m
[32m+[m[32m                                <td>DDP</td>[m
[32m+[m[32m                                <td className="text-end">{fmt(parseFloat(dossierData.ddp/dossierData.cours) || 0)} </td>[m
[32m+[m[32m                                <td className="text-end"></td>[m
[32m+[m[32m                            </tr>[m
[32m+[m[32m                        )}[m
                         <tr>[m
[31m-                            <td>10</td>[m
[31m-                            <td>DDP</td>[m
[31m-                            <td className="text-end">—</td>[m
[31m-                            <td className="text-end">{fmtDevise(dossierData.ddp)} </td>[m
[32m+[m[32m                            <td>{dossierData.typeDossier === "Aériens" ? "10" : "11"}</td>[m
[32m+[m[32m                            <td>{dossierData.typeDossier === "Aériens" ? "Autre taxes" : "DAT"}</td>[m
[32m+[m[32m                            <td className="text-end">{fmt(parseFloat(dossierData.autresDat/dossierData.cours) || 0)} </td>[m
[32m+[m[32m                            <td className="text-end"></td>[m
                         </tr>[m
                         <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>[m
[31m-                            <td>11</td>[m
[31m-                            <td>Droit&Taxes (7+8+9+10)</td>[m
[31m-                            <td colSpan="2" className="text-end"><strong>{fmt(droitEtTaxesValue)} </strong></td>[m
[31m-                        </tr>[m
[31m-                        <tr>[m
                             <td>12</td>[m
[31m-                            <td>Débarquement (Transit)</td>[m
[31m-                            <td className="text-end">{fmt(detailFraisApproche?.pourcentdeboursTransit || 0)} %</td>[m
[31m-                            <td className="text-end"><strong>{fmt(dossierData.deboursTransit || 0)} </strong></td>[m
[31m-                        </tr>[m
[31m-                        <tr>[m
[31m-                            <td>13</td>[m
[31m-                            <td>Débours Magasinage</td>[m
[31m-                            <td className="text-end">—</td>[m
[31m-                            <td className="text-end">{fmtDevise(dossierData.deboursMagasinage)} </td>[m
[32m+[m[32m                            <td>Droit&Taxes ({dossierData.typeDossier === "Aériens" ? "8+9+10" : "7+8+9+10+11"})</td>[m
[32m+[m[32m                            <td colSpan="1" className="text-end"><strong>{fmt(droitEtTaxesValue)} </strong></td>[m
[32m+[m[32m                            <td></td>[m
                         </tr>[m
[32m+[m[32m                        {dossierData.typeDossier === "Aériens" ? ([m
[32m+[m[32m                            <>[m
[32m+[m[32m                                <tr>[m
[32m+[m[32m                                    <td>13</td>[m
[32m+[m[32m                                    <td>Debours ivato</td>[m
[32m+[m[32m                                    <td className="text-end"><strong>{fmt(deboursIvatoValue)} </strong></td>[m
[32m+[m[32m                                    <td className="text-end"></td>[m
[32m+[m[32m                                </tr>[m
[32m+[m[32m                                <tr>[m
[32m+[m[32m                                    <td>14</td>[m
[32m+[m[32m                                    <td>LIVRAISON</td>[m
[32m+[m[32m                                    <td className="text-end"><strong>{fmt(livraisonValue)} </strong></td>[m
[32m+[m[32m                                    <td className="text-end"></td>[m
[32m+[m[32m                                </tr>[m
[32m+[m[32m                                <tr>[m
[32m+[m[32m                                    <td>15</td>[m
[32m+[m[32m                                    <td>had</td>[m
[32m+[m[32m                                    <td className="text-end"><strong>{fmt(totalHadValue)} </strong></td>[m
[32m+[m[32m                                    <td className="text-end"></td>[m
[32m+[m[32m                                </tr>[m
[32m+[m[32m                                <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>[m
[32m+[m[32m                                    <td >16</td>[m
[32m+[m[32m                                    <td>Frais à l'arrivée(13+14+15)</td>[m
[32m+[m[32m                                    <td className="text-end">{fmt(fraisArriveeValue)} </td>[m
[32m+[m[32m                                    <td className="text-end"></td>[m
[32m+[m[32m                                </tr>[m
[32m+[m[32m                            </>[m
[32m+[m[32m                        ) : ([m
[32m+[m[32m                            <>[m
[32m+[m[32m                                <tr>[m
[32m+[m[32m                                    <td>13</td>[m
[32m+[m[32m                                    <td>FRAIS A L'ARRIVEE</td>[m
[32m+[m[32m                                    <td className="text-end"><strong>{fmt((dossierData.deboursTransit || 0) * (parseFloat(dossierData.cours) || 1)/dossierData.cours)} </strong></td>[m
[32m+[m[32m                                    <td className="text-end"></td>[m
[32m+[m[32m                                </tr>[m
[32m+[m[32m                                <tr>[m
[32m+[m[32m                                    <td>14</td>[m
[32m+[m[32m                                    <td>Debours Magasinage</td>[m
[32m+[m[32m                                    <td className="text-end"><strong>{fmt(parseFloat(dossierData.deboursMagasinage/dossierData.cours) || 0)} </strong></td>[m
[32m+[m[32m                                    <td className="text-end"></td>[m
[32m+[m[32m                                </tr>[m
[32m+[m[32m                                <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>[m
[32m+[m[32m                                    <td >15</td>[m
[32m+[m[32m                                    <td>Débarquement(13+14)</td>[m
[32m+[m[32m                                    <td className="text-end">{fmt(debarquementValueNonAerien)} </td>[m
[32m+[m[32m                                    <td className="text-end"></td>[m
[32m+[m[32m                                </tr>[m
[32m+[m[32m                            </>[m
[32m+[m[32m                        )}[m
                         <tr>[m
[31m-                            <td>14</td>[m
[31m-                            <td>Commission Rémun</td>[m
[32m+[m[32m                            <td>16</td>[m
[32m+[m[32m                            <td>Commission SACORFINA</td>[m
[32m+[m[32m                            <td className="text-end">{fmt(parseFloat(detailFraisApproche?.commissionRemunTranslate || 0)/dossierData.cours)} </td>[m
                             <td className="text-end">{fmt(detailFraisApproche?.pourcentcommissionRemun || 0)} %</td>[m
[31m-                            <td className="text-end">{fmt((detailFraisApproche?.commissionRemunTranslate || 0) / (parseFloat(dossierData.cours) || 1))} </td>[m
                         </tr>[m
                         <tr>[m
[31m-                            <td>15</td>[m
[32m+[m[32m                            <td>17</td>[m
                             <td>Commission Bancaires</td>[m
[32m+[m[32m                            <td className="text-end">{fmt(parseFloat(dossierData.commissionBancaires/dossierData.cours) || 0)} </td>[m
                             <td className="text-end">{fmt(detailFraisApproche?.pourcentcommissionBancaire || 0)} %</td>[m
[31m-                            <td className="text-end">{fmtDevise(dossierData.commissionBancaires)} </td>[m
                         </tr>[m
                         <tr className="table-row-highlight " style={{ backgroundColor: "yellow" , fontWeight:"bold"}}>[m
[31m-                            <td>16</td>[m
[31m-                            <td>Commission (12+13+14+15)</td>[m
[31m-                            <td colSpan="2" className="text-end"><strong>{fmtDevise(commissionValue)} </strong></td>[m
[31m-                        </tr>[m
[31m-                        <tr>[m
[31m-                            <td>17</td>[m
[31m-                            <td>Transport Local</td>[m
[31m-                            <td className="text-end">{fmt((detailFraisApproche?.pourcentTransport || 0) * (parseFloat(dossierData.tc) || 0))} %</td>[m
[31m-                            <td className="text-end">{fmt((parseFloat(dossierData.transportLocal) || 0) / (parseFloat(dossierData.cours) || 1) * (parseFloat(dossierData.tc) || 0))} </td>[m
[32m+[m[32m                            <td>18</td>[m
[32m+[m[32m                            <td>Commission (16+17)</td>[m
[32m+[m[32m                            <td colSpan="1" className="text-end"><strong>{fmtDevise(commissionValue, 2)} </strong></td>[m
[32m+[m[32m                            <td></td>[m
                         </tr>[m
[31m-                       [m
[32m+[m[32m                        {dossierData.typeDossier !== "Aériens" && ([m
[32m+[m[32m                            <tr>[m
[32m+[m[32m                                <td>19</td>[m
[32m+[m[32m                                <td>Transport Local</td>[m
[32m+[m[32m                                <td className="text-end">{fmt((parseFloat(dossierData.transportLocal/dossierData.cours) || 0) * (parseFloat(dossierData.tc) || 0))} </td>[m
[32m+[m[32m                                <td className="text-end"></td>[m
[32m+[m[32m                            </tr>[m
[32m+[m[32m                        )}[m
[32m+[m[32m                        {dossierData.typeDossier === "Aériens" && ([m
[32m+[m[32m                            <tr>[m
[32m+[m[32m                                <td>19</td>[m
[32m+[m[32m                                <td>Tarif LTA</td>[m
[32m+[m[32m                                <td className="text-end">{fmt(tarifLTAValue)} </td>[m
[32m+[m[32m                                <td className="text-end"></td>[m
[32m+[m[32m                            </tr>[m
[32m+[m[32m                        )}[m
                         <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>[m
[31m-                            <td>18</td>[m
[31m-                            <td>Frais d'approche(4+6+11+16+17)</td>[m
[31m-                            <td colSpan="2" className="text-end"><strong>{fmt(fraisapproche)} </strong></td>[m
[32m+[m[32m                            <td>20</td>[m
[32m+[m[32m                            <td>Frais d'approche({dossierData.typeDossier === "Aériens" ? "4+7+11+15+19" : "4+6+12+15+18+19"})</td>[m
[32m+[m[32m                            <td colSpan="1" className="text-end"><strong>{fmt(fraisapproche)} </strong></td>[m
[32m+[m[32m                            <td></td>[m
                         </tr>[m
                         <tr className="table-row-highlight " style={{ backgroundColor: "yellow", fontWeight:"bold" }}>[m
[31m-                            <td>19</td>[m
[31m-                            <td>Coût Total (1+18)</td>[m
[31m-                            <td colSpan="2" className="text-end"><strong>{fmt(couttot)} </strong></td>[m
[32m+[m[32m                            <td>21</td>[m
[32m+[m[32m                            <td>Coût Total (1+20)</td>[m
[32m+[m[32m                            <td colSpan="1" className="text-end"><strong>{fmt(couttot)} </strong></td>[m
[32m+[m[32m                            <td></td>[m
                         </tr>[m
                     </tbody>[m
                 </table>[m
[1mdiff --git a/Frontend/src/components/comptabilite/traitement/traitementDemande.jsx b/Frontend/src/components/comptabilite/traitement/traitementDemande.jsx[m
[1mindex c0b6b69..639170d 100644[m
[1m--- a/Frontend/src/components/comptabilite/traitement/traitementDemande.jsx[m
[1m+++ b/Frontend/src/components/comptabilite/traitement/traitementDemande.jsx[m
[36m@@ -33,6 +33,13 @@[m [mfunction emptyDossierData(){[m
         ddp: "",[m
         controleRadioactive: "",[m
         autresDat: "",[m
[32m+[m[32m        autreFrais: "",[m
[32m+[m[32m        desinfecte: "",[m
[32m+[m[32m        ravinala: "",[m
[32m+[m[32m        totalHad: "",[m
[32m+[m[32m        deboursIvato: "",[m
[32m+[m[32m        compagnie: "",[m
[32m+[m[32m        tarifLTA: "",[m
     };[m
 }[m
 [m
[36m@@ -231,9 +238,23 @@[m [mexport function TraitementDemande(){[m
         }[m
     }, [valeurCAF]);[m
 [m
[32m+[m[32m    useEffect(() => {[m
[32m+[m[32m        if (dossierData.typeDossier === "Aériens" && dossierData.compagnie) {[m
[32m+[m[32m            const tarif = dossierData.compagnie === "14MA" ? 13 * (parseFloat(dossierData.cours) || 0) : 30000;[m
[32m+[m[32m            updateDossierField("tarifLTA", round4(tarif));[m
[32m+[m[32m        }[m
[32m+[m[32m    }, [dossierData.typeDossier, dossierData.compagnie, dossierData.cours]);[m
[32m+[m
[32m+[m[32m    useEffect(() => {[m
[32m+[m[32m        if (dossierData.typeDossier === "Aériens" && (dossierData.desinfecte || dossierData.ravinala)) {[m
[32m+[m[32m            const deboursIvato = (parseFloat(dossierData.desinfecte) || 0) + (parseFloat(dossierData.ravinala) || 0) + (parseFloat(dossierData.tarifLTA) || 0);[m
[32m+[m[32m            updateDossierField("deboursIvato", round4(deboursIvato));[m
[32m+[m[32m        }[m
[32m+[m[32m    }, [dossierData.typeDossier, dossierData.desinfecte, dossierData.ravinala, dossierData.tarifLTA]);[m
[32m+[m
     const detailFraisApproche = useMemo(() => {[m
         const tc = parseFloat(dossierData.tc) || 0;[m
[31m-        const clesFrais = ["deboursMagasinage", "commissionBancaires", "prestationGasyNet", "apmf","ddp", "controleRadioactive", "autresDat"];[m
[32m+[m[32m        const clesFrais = ["deboursMagasinage", "commissionBancaires", "prestationGasyNet", "apmf","ddp", "controleRadioactive", "autresDat", "autreFrais"];[m
         [m
         const deboursTransitTranslate = parseFloat(dossierData.deboursTransit * dossierData.cours) || 0;[m
         const commissionRemunTranslate = parseFloat(dossierData.commissionRemun * valeurCAF / 100) || 0;[m
[36m@@ -256,7 +277,7 @@[m [mexport function TraitementDemande(){[m
         const pourcentdouanes = valeurCAF ? parseFloat(douanesTranslate / valeurCAF * 100) : 0;[m
         const pourcentprestationGasyNet = valeurCAF ? parseFloat(prestationGasyNetTranslate / valeurCAF * 100) : 0;[m
         [m
[31m-        const total = round4(maritimeFret + maritimeMfob + totalAutresFrais + deboursTransitTranslate + commissionRemunTranslate + douanesTranslate);[m
[32m+[m[32m        const total = (parseFloat(dossierData.mfobTotal*dossierData.cours) || 0) + (parseFloat(dossierData.fretTotal*dossierData.cours) || 0) +dossierData.commissionBancaires/100 +  (parseFloat(dossierData.deboursTransit*dossierData.cours) || 0) +  (parseFloat(dossierData.transportLocal*dossierData.tc) || 0) + (parseFloat(dossierData.commissionRemun * valeurCAF /100) || 0) + (parseFloat(dossierData.douanes * valeurCAF /100) || 0) +  (parseFloat(dossierData.prestationGasyNet) || 0) +  (parseFloat(dossierData.apmf) || 0) +  (parseFloat(dossierData.ddp) || 0) +  (parseFloat(dossierData.controleRadioactive) || 0) +  (parseFloat(dossierData.autresDat) || 0) + (parseFloat(dossierData.tarifLTA) || 0) + (parseFloat(dossierData.autreFrais) || 0) + (parseFloat(dossierData.totalHad) || 0) + (parseFloat(dossierData.deboursIvato) || 0);[m
 [m
         return {[m
             deboursTransitTranslate,[m
[36m@@ -497,17 +518,28 @@[m [mexport function TraitementDemande(){[m
                                           <option value="Sucre">Sucre</option>[m
                                       </select>[m
                                  </div>[m
[31m-                                 <div className="col-md-4">[m
[31m-                                     <label className="form-label">Nombre TC</label>[m
[31m-                                     <input[m
[31m-                                        type="number"[m
[31m-                                        step="0.01"[m
[31m-                                        className="form-control"[m
[31m-                                        value={dossierData.tc}[m
[31m-                                        onChange={(e) => updateDossierField("tc", e.target.value)}[m
[31m-                                        required[m
[31m-                                        />[m
[31m-                                 </div>[m
[32m+[m[32m                                  {dossierData.typeDossier === "Aériens" ? ([m
[32m+[m[32m                                      <div className="col-md-4">[m
[32m+[m[32m                                          <label className="form-label">Compagnie <small className="text-muted fw-normal"></small></label>[m
[32m+[m[32m                                          <select className="form-select" value={dossierData.compagnie} onChange={(e) => updateDossierField("compagnie", e.target.value)}>[m
[32m+[m[32m                                              <option value="">Sélectionner</option>[m
[32m+[m[32m                                              <option value="12IV">12IV</option>[m
[32m+[m[32m                                              <option value="14MA">14MA</option>[m
[32m+[m[32m                                          </select>[m
[32m+[m[32m                                      </div>[m
[32m+[m[32m                                  ) : ([m
[32m+[m[32m                                      <div className="col-md-4">[m
[32m+[m[32m                                          <label className="form-label">Nombre TC</label>[m
[32m+[m[32m                                          <input[m
[32m+[m[32m                                             type="number"[m
[32m+[m[32m                                             step="0.01"[m
[32m+[m[32m                                             className="form-control"[m
[32m+[m[32m                                             value={dossierData.tc}[m
[32m+[m[32m                                             onChange={(e) => updateDossierField("tc", e.target.value)}[m
[32m+[m[32m                                             required[m
[32m+[m[32m                                             />[m
[32m+[m[32m                                     </div>[m
[32m+[m[32m                                  )}[m
                                   <div className="col-md-4">[m
                                       <label className="form-label">Origine</label>[m
                                       <select name="origine" className="form-control" value={dossierData.origine || ""} onChange={(e) => updateDossierField("origine", e.target.value)}>[m
[36m@@ -532,14 +564,16 @@[m [mexport function TraitementDemande(){[m
                                          ))}[m
                                      </select>[m
                                  </div>[m
[31m-                             <div className="col-md-4">[m
[31m-                                     <label className="form-label">Port</label>[m
[31m-                                     <select name="port" className="form-control" value={dossierData.port} onChange={(e) => updateDossierField("port", e.target.value)}>[m
[31m-                                         <option value="">Sélectionner le port</option>[m
[31m-                                         <option value="Diégo">Diégo</option>[m
[31m-                                         <option value="Tamatave">Tamatave</option>[m
[31m-                                     </select>[m
[31m-                                 </div>[m
[32m+[m[32m                                  {dossierData.typeDossier !== "Aériens" && ([m
[32m+[m[32m                                  <div className="col-md-4">[m
[32m+[m[32m                                          <label className="form-label">Port</label>[m
[32m+[m[32m                                          <select name="port" c