import { useEffect, useState } from "react";
import { Link } from "react-router";

import DialogPage from "../../../page/dialog_page";
import { Button } from "../../ui/button";
import CrudPage from "../../../page/crud_page";
import { frsService } from "../../../services/api";
import Nav from "../../nav/nav";

function ListeFournisseur(){
     const tete = ["NOM"];
        const keyMapping = {
            "NOM" : "nom_frs",
            
        }
        const fieldsTypes = {
        nom_frs:         { type: "input",  inputType: "text"   },
        
    };
    
        const [frs, setFrs] = useState([]);
        const [isOpen, setIsOpen] = useState(false);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [notification, setNotification] = useState("");
    
    
        const fetchFrs = async() => {
            try{
                setLoading(true);
                setError(null);
                const response = await frsService.getAll();
                setFrs(response.data);
            }catch(err){
                setError("Erreru", err)
            }finally{
                setLoading(false);
            }
        }
       
    
        useEffect(()=>{
            fetchFrs();
        }, [])
    
        const handleSuccess = (message) => {
            setIsOpen(false);
            setNotification(message);
            setTimeout(() => setNotification(null), 5000);
            fetchFrs();
    
        }
    
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
                await frsService.delete(id);
                setNotification("Suppression effectuée avec succès !");
                setTimeout(() => setNotification(null), 3000);
                fetchFrs();
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
          
                      await frsService.update(editingId, dataToSend);
                      setNotification("Modification enregistrée");
                      setTimeout(() => setNotification(null), 3000);
                      setEditingId(null); // quitter le mode édition
                      fetchFrs(); // recharger la liste
          
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
                title = "Insertion fournisseur"
                description="Veuiller inserer nouveau fournisseur"
                className="test"
            >
                <UserForm onSuccess={handleSuccess}/>
            </DialogPage>
    
            <Link to={"/home@admin"}>
                Retour
            </Link>
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
                data={frs} 
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
        nom_frs : ""
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
            await frsService.create(formData);
            setStatus("success");
            setMessage("Fournisseur bien enregistrée!");
            setFormData({
                nom_frs : ""
            });
            if(onSuccess) onSuccess("Fournisseur bien enregistré !");
        }catch (err){
            setStatus("error");
            if(err.response?.data){
                setError(err.response.data || {});
                setMessage("Veuillez corriger les erreurs dans le formulaire.");
            } else {
                setMessage("Erreur: " + err.message);
            }
            console.error("Erreur serveur:", err.response?.data); 
            console.error("Erreurs détail:", err.response?.data?.errors);
            console.log(err.response.data);
        }
    };

    return<>
        <form className="space-y-4 form-user" onSubmit={handleSubmit}>

            <div>
                <label>Nom du fournisseur</label>
                <input
                type="text"
                className={`w-full border rounded-lg p-2 form-control input-control ${errors.nom_frs ? "border-red-500" : ""}`}
                placeholder="Entrer le nom du fournisseur"
                onChange={handleChange}
                value={formData.nom_frs}
                required
                name="nom_frs"
                />
                {errors.nom_frs && <p className="text-red-500 text-sm mt-1">{errors.nom_frs}</p>}
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

export default ListeFournisseur;