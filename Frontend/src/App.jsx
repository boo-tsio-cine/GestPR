import { useEffect, useState, useRef } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { authService } from "./services/api";
import ProtectedRoute from "./components/ProtectedRoute";


import HomeAdmin from "./components/admin/home";
import ListeFournisseur from "./components/admin/fournisseur/ListeFournisseur";
import ListeOrigine from "./components/admin/origine/ListeOrigine";
import ListeTaux from "./components/admin/taux/ListeTaux";
import HistoriqueTaux from "./components/admin/taux/HistoriqueTaux";
import Demandeur from "./components/demandeur/demandeur";
import Welcome from "./components/Welcome";
import ListeUser from "./components/admin/utilisateur/ListeUser"; 

function App() {
  const { user, login} = useAuth();
  const [loading, setLoading] = useState(!user); 
  const navigate = useNavigate();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) {
      setLoading(false);
      return;
    }

    const tenterSsoWindows = async () => {
      hasChecked.current = true;
      try {
        const response = await authService.connexionAutomatiqueWindows();
        
        // 🟢 AJOUTEZ CE LOG ICI POUR VOIR LE CONTENU DANS LA CONSOLE (F12) :
        console.log("Réponse brute LDAP reçue par React :", response);

        if (response.data) {
          login(response.data); 
        }
      } catch (error) {
        console.error("Échec de la récupération LDAP Windows :", error);
      } finally {
        setLoading(false);
      }
    };

    tenterSsoWindows();
  }, [ login]);

  if (loading) {
    return (
      <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-danger" role="status"></div>
          <p className="mt-2 text-muted">Authentification Windows STAR...</p>
        </div>
      </div>
    );
  }

  
  return (
    <Routes>
      {/* 🔓 PAGE DE BIENVENUE UNIQUE AU PREMIER CHARGEMENT */}
      <Route path="/" element={<Welcome />} />

      {/* 🔒 ACCÈS ADMINISTRATION */}
      <Route path="/home@admin" element={<ProtectedRoute roles={["Admin"]}><HomeAdmin /></ProtectedRoute>} />
      <Route path="/utilisateur/ListeUser" element={<ProtectedRoute roles={["Admin"]}><ListeUser /></ProtectedRoute>} />
      <Route path="/fournisseur/ListeFournisseur" element={<ProtectedRoute roles={["Admin"]}><ListeFournisseur /></ProtectedRoute>} />
      <Route path="/origine/ListeOrigine" element={<ProtectedRoute roles={["Admin"]}><ListeOrigine /></ProtectedRoute>} />
      <Route path="/taux/ListeTaux" element={<ProtectedRoute roles={["Admin"]}><ListeTaux /></ProtectedRoute>} />
      <Route path="/taux/Historique" element={<ProtectedRoute roles={["Admin"]}><HistoriqueTaux /></ProtectedRoute>} />

      {/* 🔒 ACCÈS DEMANDEUR */}
      <Route path="/home@demandeur" element={<ProtectedRoute roles={["Demandeur"]}><Demandeur /></ProtectedRoute>} />

      {/* 🔒 ACCÈS VALIDATEUR ET COMPTABILITÉ (Ajoutez vos composants ici plus tard) */}
      <Route path="/home@validateur" element={<ProtectedRoute roles={["Validateur"]}><div className="p-4">Espace Validateur</div></ProtectedRoute>} />
      <Route path="/home@comptabilite" element={<ProtectedRoute roles={["Comptabilite"]}><div className="p-4">Espace Comptabilité</div></ProtectedRoute>} />

      {/* Si l'URL n'est pas reconnue ou qu'il y a un problème, retour à l'accueil de bienvenue */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;