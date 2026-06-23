import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import "./home.css";
import Nav from "../nav/nav";
import { frsService, origineService, tauxService, userService } from "../../services/api";
import { useEffect, useState } from "react";



    


function HomeAdmin(){

    const [count, setCount] = useState({
        utilisateur : 0,
        fournisseur : 0,
        origines : 0,
        taux : 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);


    const fetchAllCounts = async () => {
        try 
        {
            setLoading(true);
            setError(null);

            // 🚀 Exécution des 4 requêtes d'API en parallèle
            const [resUsers, resFournisseurs, resOrigines, resTaux] = await Promise.all([
                userService.count(),
                frsService.count(),
                origineService.count(),
                tauxService.count()
            ]);

            setCount({
                utilisateur : resUsers.data,
                fournisseurs: resFournisseurs.data,
                origines: resOrigines.data,
                taux: resTaux.data
            });
        } catch (err) {
            setError(err.message || "Erreur lors du chargement des statistiques");
        }finally{
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllCounts();
    }, []);




    const cards = [
    {
        key:"utilisateur",
        title:"utilisateurs",
        url: "/utilisateur/ListeUser",
        icon: Users,
        nombre : loading ? "..." : count.utilisateur
    },
    {
        key:"fournisseur",
        title:"fournisseur",
        url: "/fournisseur/ListeFournisseur",
        icon: Users,
        nombre : loading ? "..." : count.fournisseurs
    },
    {
        key:"origine",
        title:"origine",
        url: "/origine/ListeOrigine",
        icon: Users,
        nombre : loading ? "..." : count.origines
    },
    {
        key:"taux",
        title:"taux",
        url: "/taux/ListeTaux",
        icon: Users,
        nombre : loading ? "..." : count.taux
    },
];




    return<>
        <>
            <Nav/>
        </>
        <div className="home">
            <div className="header home_admin">
                <div className="title_admin">
                    <h1>
                        Tableau de bord
                    </h1>
                    <p>Vue d'ensemble de l'administration</p>
                </div>
                {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}
                <div className="grid_db">
                    {
                        cards.map((c)=>{
                            return(
                                <div >
                                    <Link key={c.key} to={c.url} className="link">
                                        <div className="bloc_db">
                                            {c.title}  ({c.nombre})
                                        </div>
                                    </Link>
                                </div>
                            )
                        })
                    }
                </div>
            </div>
        </div>
    </>
}

export default HomeAdmin;