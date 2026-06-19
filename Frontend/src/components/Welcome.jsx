import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // 🟢 Extraction ultra-sécurisée (gère "role", "Role", "username", "Username")
  const userRole = user?.role || user?.Role;
  const displayName = user?.username || user?.Username || user?.prenom || "Collaborateur";

  const handleRedirect = () => {
    if (userRole === "Admin") navigate("/home@admin");
    else if (userRole === "Demandeur") navigate("/home@demandeur");
    else if (userRole === "Validateur") navigate("/home@validateur");
    else if (userRole === "Comptabilite") navigate("/home@comptabilite");
  };

  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light text-center">
      <div className="card p-5 shadow-sm" style={{ maxWidth: "500px", borderRadius: "15px" }}>
        <h1 className="display-5 fw-bold text-danger mb-3">Bienvenue sur GestPR</h1>
        
        <p className="lead text-muted mb-4">
          Ravi de vous revoir, <strong>{displayName}</strong>.
        </p>
        
        <p className="text-secondary small mb-4">
          Votre session Windows a été identifiée avec succès. Vous êtes connecté en tant que <strong>{userRole || "Utilisateur sans rôle déterminé"}</strong>.
        </p>
        
        {userRole ? (
          <button onClick={handleRedirect} className="btn btn-danger btn-lg w-100 shadow-sm py-3">
            Accéder à mon espace {userRole}
          </button>
        ) : (
          <div className="alert alert-warning">
            Aucun rôle ne vous a été attribué dans star_identity_db. Veuillez contacter l'administrateur.
          </div>
        )}
      </div>
    </div>
  );
}

export default Welcome;