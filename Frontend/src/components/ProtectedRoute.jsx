import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, roles }) {
    // 🟢 CORRECTION 1 : On récupère l'utilisateur depuis le contexte Auth
    const { user } = useAuth(); 
    
    // 🟢 CORRECTION 2 : On appelle useLocation avec des parenthèses ()
    const location = useLocation(); 

    // Sécurité : Si l'utilisateur n'est pas du tout connecté, retour au login
    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Extraction du rôle (gère les majuscules/minuscules de l'API C#)
    const userRole = user?.role || user?.Role;

    // Si le rôle de l'utilisateur n'est pas autorisé pour cette route
    if (roles && !roles.includes(userRole)) {
        // Redirection vers une page 403 ou retour à l'accueil par défaut
        return <Navigate to="/" replace />; 
    }

    // Si tout est OK, on affiche la page demandée
    return children;
}

export default ProtectedRoute;