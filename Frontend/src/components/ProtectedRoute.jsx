
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


function ProtectedRoute({children, roles}){
    const { user, loading } = useAuth();
    const location = useLocation;

    // Attendre que la session soit restaurée
    if (loading) {
        return (
        <div className="d-flex min-vh-100 justify-content-center align-items-center">
            <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
            </div>
        </div>
        );
    }

    // Pas connecté → redirection vers login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Connecté mais mauvais rôle → redirection vers login
    if (roles && !roles.includes(user.role)) {
        return (
        <div className="d-flex min-vh-100 flex-column justify-content-center align-items-center">
            <h1 className="display-1 fw-bold text-danger">403</h1>
            <p className="fs-4">Accès interdit</p>
            <p className="text-muted">Vous n'avez pas les droits pour accéder à cette page.</p>
            <a href="/login" className="btn btn-primary mt-3">
            Retour à la connexion
            </a>
        </div>
        );
    }

    return children;

}

export default ProtectedRoute;