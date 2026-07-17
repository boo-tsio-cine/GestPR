import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import  "./Welcome.css"

function Welcome() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    authService.connexionAutomatiqueWindows()
      .then((response) => {
        console.log("Données reçues via connexionAutomatiqueWindows :", response.data);
        login(response.data);
      })
      .catch((error) => console.error("Erreur connexion automatique Windows", error));
  }, [login]);

  console.log("Contenu de user dans React :", user);
  const userRole = user?.role || user?.Role || user?.data?.role || user?.data?.Role;

  const username = user?.username || user?.Username;
  const nom = user?.nom || user?.Nom;
  const prenom = user?.prenom || user?.Prenom;
  let displayName =  "Collaborateur";

  if (username) {
    // Si on a un nom et un prénom associés à ce login en base de données, on les affiche !
    if (nom && prenom) {
      displayName = `${prenom} ${nom}`;
    } else {
      // Si l'utilisateur est identifié mais pas encore enregistré en base de données (pas de nom/prénom)
      displayName = username;
    }
  }
                                 
  const handleRedirect = () => {
    if (userRole === "Admin") navigate("/home@admin");
    else if (userRole === "Demandeur") navigate("/home@demandeur");
    else if (userRole === "Validateur") navigate("/home@validateur");
    else if (userRole === "Comptabilité") navigate("/home@comptabilite");
  };

  return (
    <div className="welcome" >
      <div className="d-flex min-vh-100 align-items-center justify-content-center text-center">
        <div className="card p-5 shadow-sm" style={{ maxWidth: "500px", borderRadius: "15px" }}>
          <div className="image_welcome">
            <img src="/image/OIP(1).jfif" alt="logo_star" srcset="" />
          </div>
          <h1 className="display-5 fw-bold text-danger mb-3">Bienvenue,</h1>
          
          <p className="lead text-muted mb-4">
            Ravi de vous revoir, <strong> {username} </strong>.
          </p>
          
          <p className="text-secondary small mb-4">
            Votre session Windows a été identifiée avec succès. Vous êtes connecté en tant que <strong style={{color:"rgb(12, 151, 12)"}}>{userRole || "Utilisateur sans rôle déterminé"}</strong>.
          </p>
          
          {userRole ? (
            <button onClick={handleRedirect} className="btn btn-danger btn-lg w-100 shadow-sm py-3">
              Accéder à mon espace {userRole}
            </button>
          ) : (
            <div className="alert alert-warning">
              Aucun rôle ne vous a été attribué dans la base de donnée. Veuillez contacter l'administrateur.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Welcome;