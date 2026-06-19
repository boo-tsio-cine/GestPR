import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from './logo.png';

import "./nav.css";




function Nav(){

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("gestpr_user");
        navigate("/login");
    }

    const handleLogoutWithConfirmation = () => {
        if (window.confirm("Voulez-vous vraiment vous déconnecter ?")) {
            handleLogout();
        }
    };

    const storedUser = JSON.parse(localStorage.getItem("gestpr_user"));
    const userRole = storedUser?.role;
    const userNom = storedUser?.nom;
    const userPrenom = storedUser?.prenom;


    return<>
        <nav className="navbar  px-4" style={{
            color:"red", backgroundColor:"#c00707",position:"fixed"
        }}>
            <div className="logo">
                <img src={logo} alt="logo" onError={(e) => {    // ← fallback si image manquante
                        e.target.style.display = "none";
                    }} />
            </div>

            <div className="d-flex align-items-center gap-3">
                {/* 🏠 LIENS ACCESSIBLES PAR TOUT LE MONDE CONNECTÉ */}
                {
                    userRole === "Admin" && <Link className="nav-link" to="/home@admin">Tableau de bord</Link>
                }
                {
                    userRole === "Demandeur" && <Link className="nav-link" to="/home@demandeur">Mes demandes</Link>
                }

                {/* 🛠️ MENUS VISIBLES UNIQUEMENT PAR L'ADMIN */}
                {
                    userRole === "Admin" && (
                        <>
                            <Link className="nav-link" to="/utilisateur/ListeUser">Utilisateur</Link>
                            <Link className="nav-link" to="/fournisseur/ListeFournisseur">Fournisseurs</Link>
                            <Link className="nav-link" to="/taux/ListeTaux">Gestion des Taux</Link>
                        </>
                    )
                }

                
                {/* 👤 INFOS UTILISATEUR ET DÉCONNEXION */}
                    {storedUser && (
                        <div className="d-flex align-items-center gap-3 text-white">
                            {/* ✅ AFFICHAGE DU NOM ET PRÉNOM (Si dispo en BDD) SINON MATRICULE */}
                            <small style={{ color : "white"}}>
                                <strong>
                                    {userPrenom && userNom 
                                        ? `${userPrenom} ${userNom}` 
                                        : username} ({userRole})
                                </strong>
                            </small>
                           
                        </div>
                    )}
                </div>
                
            </nav>
    </>
}

export default Nav;
