import { useEffect, useState } from "react";

const HistoriqueAudit = ({ demandeId }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        if(!demandeId) return;

        fetch(`/api/audit/Demande/${demandeId}`)
            .then(response => response.json())
            .then((data) => {
                setLogs(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Erreur lors de la récupération des logs :", err);
                setLoading(false);
            })
    }, [demandeId]);

    if (loading) return <p>Chargement de l'historique...</p>;
    if (logs.length === 0) return <p>Aucun historique trouvé pour cette demande.</p>;

    return (
        <div className="audit-timeline" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>Historique & Traçabilité (Audit Trail)</h3>
            <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                {logs.map((log) => (
                <li key={log.id} style={{ marginBottom: '12px', borderBottom: '1px dashed #ccc', pb: '8px' }}>
                    <div>
                    <strong>{log.action}</strong> par <em>{log.userMatricule || 'Anonyme'}</em> le{' '}
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                    </div>
                    <div style={{ color: '#555', fontSize: '0.9em', marginTop: '4px' }}>
                    {log.details}
                    </div>
                </li>
                ))}
            </ul>
        </div>
    );
};

export default HistoriqueAudit;