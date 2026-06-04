import { createContext, useContext, useEffect, useState } from "react";


const AuthContext = createContext(null);

export function AuthProvider({ children }){
    const [user, setUser] = useState(null);  // { token, role, nom, prenom, matricule }
    const [loading, setLoading] = useState(true);


    // Restaurer la session au démarrage
    useEffect(() => {
        const stored = localStorage.getItem("gestpr_user");
        if (stored){
            setUser(JSON.parse(stored));
        }

        setLoading(false);
    }, []);


    // Connexion — sauvegarder le token et les infos
    const login = (userData) => {
        localStorage.setItem("gestpr_user", JSON.stringify(userData));
        setUser(userData);
    };

    // Déconnexion — effacer la session
    const logout = () => {
        localStorage.removeItem("gestpr_user");
        setUser(null);
    };

    return(
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {
                children
            }
        </AuthContext.Provider>
    );


}


// Hook personnalisé pour utiliser le contexte
export function useAuth(){
    return useContext(AuthContext);
}