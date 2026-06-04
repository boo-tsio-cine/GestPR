

import CrudPage from "../../../page/crud_page";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { tauxHistoriqueService } from "../../../services/api";
import Nav from "../../nav/nav";

function HistoriqueTaux(){

    const tete = ["NOM", "ANCIEN VALEUR","NOUVELLE VALEUR","DATE DE MODIFICATION"];
        const keyMapping = {
            "NOM"                  : "nomTaux",        // ← minuscule
            "ANCIEN VALEUR"        : "ancienValeur",   // ← minuscule
            "NOUVELLE VALEUR"      : "nouvelleValeur", // ← minuscule
            "DATE DE MODIFICATION" : "dateTime",       // ← minuscule
            };
    
    
        const [taux, setTaux] = useState([]);
        // const [isOpen, setIsOpen] = useState(false);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [notification, setNotification] = useState("");
    
    
        const fetchTaux = async() => {
            try{
                setLoading(true);
                setError(null);
                const response = await tauxHistoriqueService.getAll();
                console.log("Données reçues:", response.data);      // ← voir la structure
                console.log("Premier élément:", response.data[0]);
                setTaux(response.data);
            }catch(err){
                setError("Erreru", err)
            }finally{
                setLoading(false);
            }
        }
       
    
        useEffect(()=>{
            fetchTaux();
        }, [])
    
        

    return<>
    <Nav/>
        <Link to={"/taux/ListeTaux"}>
            Retour
        </Link>

         {notification && (
            <div className="mb-4 p-4 bg-green-500 text-red rounded-lg shadow-lg text-center">
                {notification}
            </div>
        )}

        {loading && <p>Chargement ...</p>}
        {error && <p className="text-red-500">
            {error}    
        </p>}
        {!loading && !error &&(
            <CrudPage 
                keyMapping={keyMapping} 
                headers={tete} 
                data={taux} 
                
            />
        )

        }
    </>
}

export default HistoriqueTaux;