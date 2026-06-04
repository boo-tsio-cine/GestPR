import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import "./home.css";
import Nav from "../nav/nav";

const cards = [
    {
        key:"utilisateur",
        title:"utilisateurs",
        url: "/utilisateur/ListeUser",
        icon: Users,
        nombre : 15
    },
    {
        key:"fournisseur",
        title:"fournisseur",
        url: "/fournisseur/ListeFournisseur",
        icon: Users,
        nombre : 90
    },
    {
        key:"origine",
        title:"origine",
        url: "/origine/ListeOrigine",
        icon: Users,
        nombre : 17
    },
    {
        key:"taux",
        title:"taux",
        url: "/taux/ListeTaux",
        icon: Users,
        nombre : 18
    },
];

function HomeAdmin(){
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