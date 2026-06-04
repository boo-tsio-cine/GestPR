import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import DialogPage from "../../../page/dialog_page";
import { Link } from "react-router";
import CrudPage from "../../../page/crud_page";
import { tauxService} from "../../../services/api";
import Nav from "../../nav/nav";

function ListeTaux(){

    const tete = ["NOM", "CLE","VALEUR","UNITE","DESCRIPTION", "TYPE DE PRODUIT"];
    const keyMapping = {
        "NOM" : "nom",
        "CLE" : "cle",
        "VALEUR" : "valeur",
        "UNITE" : "unite",
        "DESCRIPTION" : "description", 
        "TYPE DE PRODUIT" : "produit" 
    }

    const fieldsTypes = {
        nom:         { type: "input",  inputType: "text"   },
        cle:         { type: "input",  inputType: "text"   },
        valeur:      { type: "input",  inputType: "number" },
        unite:       { type: "select", options: ["%", "T", "Kg", "L", "m²", "€"] },
        description: { type: "input",  inputType: "text"   },
        produit:     { type: "input",  inputType: "text"   },
    };

    const [taux, setTaux] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState("");


    const fetchTaux = async() => {
        try{
            setLoading(true);
            setError(null);
            const response = await tauxService.getAll();
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

    const handleSuccess = (message) => {
        setIsOpen(false);
        setNotification(message);
        setTimeout(() => setNotification(null), 5000);
        fetchTaux();

    }

    // DELETE
    const handleDelete = async (id) => {
        // Demander confirmation avant de supprimer
        console.log("Id à supprimer : ", id)

        if (!id) {
            console.error("ID manquant !");
            return;
        }



        const confirme = window.confirm("Voulez-vous vraiment supprimer cet enregistrement ?");
        if (!confirme) return;

        try{
            await tauxService.delete(id);
            setNotification("Suppression effectuée avec succès !");
            setTimeout(() => setNotification(null), 3000);
            fetchTaux();
        }catch(err){
            console.error("Erreur de suppression : " , err.response?.data);
            console.error("Erreur suppression détail:", err.response?.data);  // ← détail
            console.error("Status:", err.response?.status);
            console.error("URL appelée:", err.config?.url);  // ← voir l'URL construite
            setNotification("Erreur lors de la suppression.");

        }
    }



    // UPDATE
    // ── États pour l'édition inline ──────────────────────────
    const [editingId, setEditingId] = useState(null); //id de la ligne en cours
    const [editData, setEditData] = useState({}); //valeur modifier


    // Clic sur ✏️ — activer l'édition de la ligne
    const handleEdit = (ligne) => {
        setEditingId(ligne.id);
        setEditData({...ligne});
    };


    // Modifier un champ dans la ligne
    const handleEditChange = (e) =>{
        setEditData(prev => ({
            ...prev,
            [e.target.name] : e.target.value
        }));
    };

    // Clic sur ✅ — sauvegarder
    const handleSave = async () => {
        try{
            const dataToSend = {
                ...editData,
                valeur: parseFloat(editData.valeur) || 0, //string->number
            };

            await tauxService.update(editingId, dataToSend);
            setNotification("Modification enregistrée");
            setTimeout(() => setNotification(null), 3000);
            setEditingId(null); // quitter le mode édition
            fetchTaux(); // recharger la liste

        }catch (err) {
            console.error("Erreur update:", err.response?.data);
            setNotification("Erreur lors de la modification.");
        }
    };

    // Clic sur ❌ — annuler sans sauvegarder
    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };


    return <>
        <Nav/>
        <DialogPage
            isOpen={isOpen}
            onClose = {()=> setIsOpen(false)}
            title = "Insertion taux"
            description="Veuiller inserer nouveau teaux"
            className="test"
        >
            <UserForm onSuccess={handleSuccess}/>
        </DialogPage>
        <div style={{
            paddingTop :"5rem"
        }}>

            <Link to={"/home@admin"}>
                Retour
            </Link>
            <Link to={"/taux/Historique"}>
                Historique
            </Link>
        </div>
        <Button 
            onClick={() => setIsOpen(true)}
        >
            Insérer
        </Button>

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
                onDelete= {handleDelete}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                editingId={editingId}
                editData={editData}
                onEditChange={handleEditChange}
                fieldsTypes = {fieldsTypes}
                
            />
        )

        }
    </>
}


function UserForm({ onSuccess }){
    const [formData, setFormData] = useState({
        nom : "",
        cle : "",
        valeur : "",
        unite : "",
        description : "",
        type_produit : "",
    });


    const [status, setStatus] = useState(null);
    const [message, setMessage] = useState("");
    const [errors, setError] = useState({});

    const handleChange = (e) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name] : e.target.value
        }))

        if (errors[e.target.name]){
            setError((prev) => ({
                ...prev, [e.target.name] : null
            }));
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        // ✅ Bloquer si déjà en cours
        if (status === "loading") return;

        setStatus("loading");
        setMessage("");
        setError({});
        console.log("Données envoyées:", formData);
        try{
            await tauxService.create(formData);
            setStatus("success");
            setMessage("Taux bien enregistrée!");
            setFormData({
                nom : "",
                cle : "",
                valeur : "",
                unite : "",
                description: "",
                type_produit: "",
            });
            if(onSuccess) onSuccess("Taux bien enregistré !");
        }catch (err){
            setStatus("error");
            if(err.response?.data){
                setError(err.response.data);
                setMessage("Veuillez corriger les erreurs dans le formulaire.");
            } else {
                setMessage("Erreur: " + err.message);
            }
            console.error("Erreur serveur:", err.response?.data); 
            console.error("Erreurs détail:", err.response?.data?.errors);
        }
    };

    return<>
        <form className="space-y-4 form-user" onSubmit={handleSubmit}>

            <div>
                <label>Nom du taux</label>
                <input
                type="text"
                className={`w-full border rounded-lg p-2 form-control input-control ${errors.nom ? "border-red-500" : ""}`}
                placeholder="Entrer le nom"
                onChange={handleChange}
                value={formData.nom}
                required
                name="nom"
                />
                {errors.nom && <p className="text-red-500 text-sm mt-1">{errors.nom}</p>}
            </div>

            <div>
                <label>Clé du taux</label>
                <input
                    type="text"
                    className={`w-full border rounded-lg p-2 form-control input-control ${errors.cle ? "border-red-500" : ""}`}
                    placeholder="Entrer le cle"
                    onChange={handleChange}
                    value={formData.cle}
                    required
                    name="cle"
                />
                {errors.cle && <p className="text-red-500 text-sm mt-1">{errors.cle}</p>}
            </div>

            <div>
                <label>valeur</label>
                <input
                type="number"
                className={`w-full border rounded-lg p-2 form-control input-control ${errors.valeur ? "border-red-500" : ""}`}
                placeholder="Entrer le valeur"
                onChange={handleChange}
                value={formData.valeur}
                required
                name="valeur"
                />
                {errors.valeur && <p className="text-red-500 text-sm mt-1">{errors.valeur}</p>}
            </div>

            
            <div>
                <label>Unité</label>
                <select
                className={`w-full border rounded-lg p-2 form-control input-control ${errors.unite ? "border-red-500" : ""}`}
                onChange={handleChange}
                value={formData.unite}
                name="unite"
                >
                <option value="">Sélectionner un rôle</option>
                <option value="T">Tone</option>
                <option value="Kg">Kg</option>
                <option value="Conteneur">Conteneur</option>
                <option value="%">%</option>
                {/* <option value="Validateur">Validateur</option> */}
                </select>
                {errors.unite && <p className="text-red-500 text-sm mt-1">{errors.unite}</p>}
            </div>

            <div>
                <label>Description</label>
                <textarea
                type="text"
                className={`w-full border rounded-lg p-2 form-control input-control ${errors.description ? "border-red-500" : ""}`}
                placeholder="Entrer la description....."
                onChange={handleChange}
                value={formData.description}
                name="description"
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
                <label>Produit</label>
                <select
                className={`w-full border rounded-lg p-2 form-control input-control ${errors.produit ? "border-red-500" : ""}`}
                onChange={handleChange}
                value={formData.produit}
                name="produit"
                >
                <option value="">Sélectionner un rôle</option>
                <option value="Malte">Malte</option>
                <option value="Sucre">Sucre</option>
                <option value="Cannete">Cannetes</option>
                {/* <option value="Validateur">Validateur</option> */}
                </select>
                {errors.produit && <p className="text-red-500 text-sm mt-1">{errors.produit}</p>}
            </div>

            <Button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Enregistrement..." : "Enregistrer"}
            </Button>

            {message && status === "error" && (  // ← ajoute status === "error"
                <p style={{ color: "red", background: "white" }}>
                    {message}
                </p>
            )}
        </form>
    </>
}

export default ListeTaux;