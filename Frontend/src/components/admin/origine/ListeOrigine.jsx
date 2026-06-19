import { useEffect, useState } from "react";
import DialogPage from "../../../page/dialog_page";
import { Link } from "react-router";
import { Button } from "../../ui/button";
import CrudPage from "../../../page/crud_page";
import { origineService } from "../../../services/api";
import Nav from "../../nav/nav";
import listPays from "../../../data/pays.json";

function ListeOrigine(){
      const tete = ["PAYS"];
        const keyMapping = {
            "PAYS" : "pays",
            
        }

           const fieldsTypes = {
        pays:         { type: "input",  inputType: "text"   },
        
    };
    
        const [origine, setOrigine] = useState([]);
        const [isOpen, setIsOpen] = useState(false);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);
        const [notification, setNotification] = useState("");
    
    
        const fetchOrigine = async() => {
            try{
                setLoading(true);
                setError(null);
                const response = await origineService.getAll();
                setOrigine(response.data);
            }catch(err){
                setError(err.message || "Erreur de chargement")
            }finally{
                setLoading(false);
            }
        }
       
    
        useEffect(()=>{
            fetchOrigine();
        }, [])
    
        const handleSuccess = (message) => {
            setIsOpen(false);
            setNotification(message);
            setTimeout(() => setNotification(null), 5000);
            fetchOrigine();
    
        }
    
        const handleDelete = async (id) => {
            // Demander confirmation avant de supprimer
            console.log("Id à supprimer : ", id)
    
            if (!id) {
                console.error("ID manquant !");
                return;
            }
    
    
    
            const confirme = window.confirm("Voulez-vous vraiment supprimer ce pays ?");
            if (!confirme) return;
    
            try{
                await origineService.delete(id);
                setNotification("Suppression effectuée avec succès !");
                setTimeout(() => setNotification(null), 3000);
                fetchOrigine();
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
                           };

                           await origineService.update(editingId, dataToSend);
                           setNotification("Modification enregistrée");
                           setTimeout(() => setNotification(null), 3000);
                           setEditingId(null); // quitter le mode édition
                           fetchOrigine(); // recharger la liste

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
            <div 
                style = {{
                    paddingTop : "5rem",
                }}
            >
                <DialogPage
                    isOpen={isOpen}
                    onClose = {()=> setIsOpen(false)}
                    title = "Insertion pays d'origine"
                    description="Veuiller inserer nouveau pays d'origine"
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
                    data={origine} 
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

            </div>
            
        </>
}



function UserForm({ onSuccess }){
    const [formData, setFormData] = useState({
        pays : ""
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
            await origineService.create(formData);
            setStatus("success");
            setMessage("Pays d'origione bien enregistrée!");
            setFormData({
                pays : ""
            });
            if(onSuccess) onSuccess("Pays d'origine bien enregistré !");
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
                <label>Pays D'origine</label>
                {/* <input
                type="text"
                className={`w-full border rounded-lg p-2 form-control input-control ${errors.nom_frs ? "border-red-500" : ""}`}
                placeholder="Entrer un pays"
                onChange={handleChange}
                value={formData.pays}
                required
                name="pays"
                /> */}
                <select 
                    name="pays" 
                    id=""
                    className={`w-full border rounded-lg p-2 form-control input-control ${errors.pays ? "border-red-500" : ""}`}
                    onChange={handleChange}
                    value={formData.pays}
                    required
                >
                    <option value="">
                        Sélectionner un pays d'origine...
                    </option>
                    {
                        listPays.map(p => (
                            <option key={p.code} value={p.nom}>
                                {p.drapeau} {p.nom}
                            </option>
                        ))
                    }
                </select>
                {errors.pays && <p className="text-red-500 text-sm mt-1">{errors.pays}</p>}
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



export default ListeOrigine;