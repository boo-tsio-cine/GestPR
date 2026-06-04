import { Link, Navigate, Route, Routes } from "react-router-dom"
import Login from "./components/auth/login"
import Signup from "./components/auth/signup"
import HomeAdmin from "./components/admin/home"
import ListeUser from "./components/admin/utilisateur/ListeUser"
import ListeFournisseur from "./components/admin/fournisseur/ListeFournisseur"
import ListeOrigine from "./components/admin/origine/ListeOrigine"
import ListeTaux from "./components/admin/taux/ListeTaux"
import HistoriqueTaux from "./components/admin/taux/HistoriqueTaux"
import Demandeur from "./components/demandeur/demandeur"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {

  
  return (
    <Routes>
      {/* Page publique */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
       {/* Pages protégées par rôle */}
      
      <Route path="/home@admin" element={
        <ProtectedRoute roles={["Admin"]}>
          <HomeAdmin />
         </ProtectedRoute> 
      } />
      <Route path="/utilisateur/ListeUser" element={
        <ProtectedRoute roles={["Admin"]}>
          <ListeUser />
         </ProtectedRoute> 
      } />
      <Route path="/fournisseur/ListeFournisseur" element={
        <ProtectedRoute roles={["Admin"]}>
          <ListeFournisseur />
         </ProtectedRoute> 
      } />
      <Route path="/origine/ListeOrigine" element={
        <ProtectedRoute roles={["Admin"]}>
          <ListeOrigine />
         </ProtectedRoute> 
      } />
      <Route path="/taux/ListeTaux" element={
        <ProtectedRoute roles={["Admin"]}>
          <ListeTaux />
         </ProtectedRoute> 
      } />
      <Route path="/taux/Historique" element={
        <ProtectedRoute roles={["Admin"]}>
          <HistoriqueTaux />
         </ProtectedRoute> 
      } />
      <Route path="/home@demandeur" element={
        <ProtectedRoute roles={["Demandeur"]}>
          <Demandeur />
         </ProtectedRoute> 
      } />

      {/* Route par défaut → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />


      <Route path="/" element={
        <section className="d-flex min-vh-100 flex-column align-self-center justify-content-center align-items-center gap-4 bg-body px-3 text-center">
          <div>
            <h1 className="fs-2 fw-bold lh-tight">
              Bienvenue
            </h1>
            <p className="mt-1 text-muted">
              Connectez-vous ou créez votre compte pour continuer.
            </p>
          </div>
          <div className="d-flex gap-3">
            <Link
              to="/login"
              className="btn btn-primary btn-sm py-2"
            >
              Se connecter
            </Link>
            <Link
              to="/signup"
              className="btn btn-outline-secondary btn-sm py-2"
            >
              Créer un compte
            </Link>
          </div>
        </section>
      } />
    </Routes>
  )
}

export default App
