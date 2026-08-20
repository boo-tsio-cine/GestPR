import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { demandeService, userService } from "../services/api";
import { History as HistoryIcon, Clock, User, X, FileText } from "lucide-react";

export default function AuditDialog({ demandeId, onClose, open }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [utilisateurs, setUtilisateurs] = useState([]);

    useEffect(() => {
        if (open && demandeId) {
            fetchAuditLogs();
        }
    }, [open, demandeId]);

    useEffect(() => {
        if (open) {
            fetchUtilisateurs();
        }
    }, [open]);

    const fetchUtilisateurs = async () => {
        try {
            const res = await userService.getAll();
            let data = [];
            if (res?.data?.data && Array.isArray(res.data.data)) {
                data = res.data.data;
            } else if (res?.data && Array.isArray(res.data)) {
                data = res.data;
            } else if (Array.isArray(res)) {
                data = res;
            }
            setUtilisateurs(data);
        } catch (err) {
            console.error("Erreur lors de la récupération des utilisateurs :", err);
        }
    };

    const getUserName = (id) => {
        if (!id) return "Système";
        const user = utilisateurs.find(u => (u.id ?? u.Id) == id);
        if (user) {
            const nom = user.nom || user.Nom || "";
            const prenom = user.prenom || user.Prenom || "";
            const fullName = `${prenom} ${nom}`.trim();
            return fullName || `Utilisateur ID: ${id}`;
        }
        return `Utilisateur ID: ${id}`;
    };

    const fetchAuditLogs = async () => {
        setLoading(true);
        try {
            const res = await demandeService.getAuditLogs(demandeId);
            console.log("🔍 Réponse brute d'audit reçue :", res);

            // 🎯 Extraction précise selon la structure ApiResponse<T>
            let extractedData = [];
            if (res?.data?.data && Array.isArray(res.data.data)) {
                extractedData = res.data.data;
            } else if (res?.data && Array.isArray(res.data)) {
                extractedData = res.data;
            } else if (Array.isArray(res)) {
                extractedData = res;
            }

            setLogs(extractedData);
        } catch (err) {
            console.error("Erreur lors de la récupération de l'historique :", err);
            toast.error("Impossible de charger l'historique de suivi.");
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    if (!open || !demandeId) return null;

    return createPortal(
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(4px)',
                zIndex: 999999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.75rem',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    width: '100%',
                    maxWidth: '42rem',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                    color: '#1f2937'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* En-tête */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <HistoryIcon style={{ width: '1.25rem', height: '1.25rem', color: '#2563eb' }} />
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                            Historique & Suivi DEM-{String(demandeId).padStart(3, '0')}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#6b7280' }}
                    >
                        <X style={{ width: '1.25rem', height: '1.25rem' }} />
                    </button>
                </div>

                {/* Contenu */}
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: 0, marginBottom: '1rem' }}>
                        Tracé de toutes les actions enregistrées.
                    </p>

                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
                            {[1, 2, 3].map((n) => (
                                <div key={n} style={{ height: '3.5rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem', animation: 'pulse 1.5s infinite' }} />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '1.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                            Aucun historique enregistré pour cette demande.
                        </p>
                    ) : (
                        <div style={{ borderLeft: '2px solid #e5e7eb', marginLeft: '1rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {logs.map((log, index) => {
                                const actionName = log.action || log.Action || "Action";
                                const dateVal = log.dateAction 
                                    ? new Date(log.dateAction).toLocaleDateString('fr-FR') 
                                    : '';
                                const userVal = log.utilisateurId || log.UtilisateurId;
                                const statusVal = log.nouveauStatut || log.NouveauStatut;
                                const commentVal = log.commentaire || log.Commentaire;
                               

                                return (
                                    <div key={log.id || log._id || index} style={{ position: 'relative' }}>
                                        <span style={{
                                            position: 'absolute',
                                            left: '-1.95rem',
                                            top: '0.25rem',
                                            width: '0.75rem',
                                            height: '0.75rem',
                                            borderRadius: '50%',
                                            backgroundColor: '#2563eb',
                                            border: '2px solid #ffffff'
                                        }} />
                                        
                                        <div style={{ backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #f3f4f6' }}>
                                            {/* <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>
                                                    {actionName}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Clock style={{ width: '0.75rem', height: '0.75rem' }} />
                                                    {dateVal ? new Date(dateVal).toLocaleDateString("fr-FR") : ''}
                                                </span>
                                            </div> */}

                                            <div style={{ fontSize: '0.75rem', color: '#4b5563', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <User style={{ width: '0.75rem', height: '0.75rem', color: '#9ca3af' }} />
                                                <span>{getUserName(userVal)}</span>
                                                {statusVal && (
                                                <span style={{ marginLeft: 'auto', fontWeight: 500, padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', ...(statusVal ? {
    color: statusVal === "Nouvelle" ? "#000927" : statusVal === "En attente" ? "#854D0E" : statusVal === "Validée" ? "#166534" : "#9F1239",
    backgroundColor: statusVal === "Nouvelle" ? "#a9caf5" : statusVal === "En attente" ? "#FEF9C3" : statusVal === "En cours" ? "#FEF9C3" : statusVal === "Validée" ? "#DCFCE7" : "#FFE4E6"
} : {}) }}>
                                                    Statut : {statusVal}
                                                </span>
                                                )}
                                            </div>

                                            {commentVal && (
                                                <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: '#4b5563', backgroundColor: '#ffffff', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #e5e7eb', marginTop: '0.5rem', marginBottom: 0 }}>
                                                    "{commentVal}"
                                                </p>
                                            )}

                                            {/* Affichage optionnel du détail de l'immo/type de dossier */}
                                            {log.details && (log.details.typeDossier || log.details.immo) && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#6b7280', display: 'flex', gap: '1rem' }}>
                                                    {log.details.typeDossier && <span>Dossier: <strong>{log.details.typeDossier}</strong></span>}
                                                    {log.details.immo && <span>Immo: <strong>{log.details.immo}</strong></span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}