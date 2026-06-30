import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from './logs.png';

import "./nav.css";




function Nav(){

    const { user } = useAuth();
    




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
