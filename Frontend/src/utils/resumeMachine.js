const num = (v) => parseFloat(v) || 0;

export function construireResumeMachine({
    dossierData, valeurCAF, detailFraisApproche, fraisApprocheTotal,
    lignes, saisies, resultatsParArticle, idDemande,
}) {
    return {
        idDemande: Number(idDemande) || 0,
        typeDossier: dossierData.typeDossier || "",
        origine: dossierData.origine || "",
        port: dossierData.port || "",
        fournisseur: dossierData.fournisseur || "",
        usine: dossierData.usine || "",
        devise: dossierData.unitcours || "",
        cours: String(dossierData.cours || ""),
        postesFrais: {
            fobTotal: num(dossierData.fobTotal),
            mfobTotal: num(dossierData.mfobTotal),
            fretTotal: num(dossierData.fretTotal),
            valeurCAF: num(valeurCAF),
            douanes: detailFraisApproche.douanesTranslate,
            commissionRemun: detailFraisApproche.commissionRemunTranslate,
            deboursTransit: detailFraisApproche.deboursTransitTranslate,
            prestationGasyNet: detailFraisApproche.prestationGasyNetTranslate,
            transportLocal: detailFraisApproche.transportLocalTranslate,
            deboursMagasinage: num(dossierData.deboursMagasinage),
            commissionBancaires: num(dossierData.commissionBancaires),
            apmf: num(dossierData.apmf),
            ddp: num(dossierData.ddp),
            controleRadioactive: num(dossierData.controleRadioactive),
            autresDat: num(dossierData.autresDat),
            autreFrais: num(dossierData.autreFrais),
            tarifLTA: num(dossierData.tarifLTA),
            totalHad: num(dossierData.totalHad),
            deboursIvato: num(dossierData.deboursIvato),
            fraisApprocheTotal: num(fraisApprocheTotal),
        },
        articles: lignes.map(({ rowKey, lot }) => ({
            designation: lot.designation || "",
            codeLot: lot.codeLot || "",
            quantite: num(saisies[rowKey]?.quantite),
            puAriary: resultatsParArticle[rowKey]?.puAriary || 0,
        })),
    };
}