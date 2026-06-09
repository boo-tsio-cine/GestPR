import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import logo from './logo.png';

import "./nav.css";




function Nav(){

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login");
    }

    const handleLogoutWithConfirmation = () => {
        if (window.confirm("Voulez-vous vraiment vous déconnecter ?")) {
            handleLogout();
        }
    };

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
                {/* Infos utilisateur */}
                <span className="text-white">
                {user?.prenom} {user?.nom} {user?.id}
                <span className="badge bg-secondary ms-2">{user?.role}</span>
                </span>

                {/* Bouton déconnexion */}
                <button
                className="btn  btn-sm deconnexion"
                onClick={handleLogoutWithConfirmation}
                >
                🚪 Déconnexion
                </button>
            </div>
            </nav>
    </>
}

export default Nav;
