import { Link } from "react-router-dom";
import CrudPage from "../../../page/crud_page";
import { useEffect, useState } from "react";
import DialogPage from "../../../page/dialog_page";
// import { useForm } from "react-hook-form";
import { Button } from "../../../components/ui/button";
import "./ListeUser.css";
import { userService } from "../../../services/api";
import Nav from "../../nav/nav";

function ListeUser(){
  const tete = ["NOM" , "PRENOM" , "MATRICULE", "MAIL", "FIXE", "ROLE", "SITE"];
  const keyMapping = {
  
    "NOM": "nom",
    "PRENOM": "prenom",
    "MATRICULE": "matricule",
    "FIXE": "fixe",
    "MAIL": "mail",
    "ROLE": "role",
    "SITE": "site"
  };

  const fieldsTypes = {
        nom:         { type: "input",  inputType: "text"   },
        prenom:         { type: "input",  inputType: "text"   },
        matricule:      { type: "input",  inputType: "number" },
        mail:       { type: "input", inputType: "mail"},
        fixe: { type: "input",  inputType: "number"   },
        role:     { type: "select",  options: ["Admin", "Comptabilité", "Demandeur", "Validateur"   ]},
        site:     { type: "input",  inputType: "text"   },
    };
  
  const [isOpen, setIsOpen] = useState(false);
  const [mainBlur, setMainBlur] = useState(false);
  const [notification, setNotification] = useState(null);
  
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [utilisateurs, setUtilisateurs] = useState([]);
  
  const fetchUtilisateurs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getAll(); 
      setUtilisateurs(response.data);
      
      // setUtilisateurs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur API:", err);
      
      
    } finally {
      setLoading(false);
    }
  } 
  
  useEffect (() => {
    fetchUtilisateurs();
  }, []); // [] = s'exécute une seule fois au chargement
  
  
  // ✅ Après succès d'insertion, recharge la liste
  
  const handleSuccess = (message) => {
    setIsOpen(false);
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
    fetchUtilisateurs();// ← recharge la liste automatiquement
  };

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
          await userService.delete(id);
          setNotification("Suppression effectuée avec succès !");
          setTimeout(() => setNotification(null), 3000);
          fetchUtilisateurs();
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
  
              await userService.update(editingId, dataToSend);
              setNotification("Modification enregistrée");
              setTimeout(() => setNotification(null), 3000);
              setEditingId(null); // quitter le mode édition
              fetchUtilisateurs(); // recharger la liste
  
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
  
  
  return<>
    <Nav/>
    <DialogPage
        isOpen={isOpen}
        onClose={()=>setIsOpen(false)}
        title = "Insertion utilisateur"
        description="Veuiller inserer nouveau utilisateur"
        className="test"
        >
        <UserForm onSuccess={handleSuccess}/>
    </DialogPage>
    <Link to={"/home@admin"}>Retour</Link>
        
    <Button  onClick={()=>setIsOpen(true)}>Insérer</Button>
          
        
    {notification && (
      <div className="mb-4 p-4 bg-green-500 text-red rounded-lg shadow-lg text-center">
        {notification}
      </div>
    )}
        
        {/* <CrudPage
                headers={tete}
                data={Utilisateur}
        /> */}
    {loading && <p>Chargement...</p>}
    {error   && <p className="text-red-500">{error}</p>}
    {!loading && !error && (
      <CrudPage 
                keyMapping={keyMapping} 
                headers={tete} 
                data={utilisateurs} 
                onDelete= {handleDelete}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                editingId={editingId}
                editData={editData}
                onEditChange={handleEditChange}
                fieldsTypes = {fieldsTypes}
            />
    )}
  </>          
}
function UserForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    matricule: "",
    mail: "",
    fixe: "",
    role: "",
    site: "",
  });

  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: null }));
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    setErrors({});

    try {
      await userService.create(formData);
      setStatus("success");
      setMessage("Personne enregistrée avec succès !");
      setFormData({ 
          nom: "",
          prenom: "",
          matricule: "",
          mail: "",
          fixe: "",
          role: "",
          site: "",
      });
      if (onSuccess) onSuccess("Personne enregistrée avec succès !"); // ← passe le message
    } catch (err) {
      setStatus("error");
      if (err.response?.data) {
        setErrors(err.response.data);
        setMessage("Veuillez corriger les erreurs dans le formulaire.");
      } else {
        setMessage("Erreur: " + err.message);
      }
    }
  };

  return (
    <form className="space-y-4 form-user" onSubmit={handleSubmit}>

      <div>
        <label>Nom</label>
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
        <label>Prénom</label>
        <input
          type="text"
          className={`w-full border rounded-lg p-2 form-control input-control ${errors.prenom ? "border-red-500" : ""}`}
          placeholder="Entrer le prenom"
          onChange={handleChange}
          value={formData.prenom}
          required
          name="prenom"
        />
        {errors.prenom && <p className="text-red-500 text-sm mt-1">{errors.prenom}</p>}
      </div>

      <div>
        <label>Matricule</label>
        <input
          type="text"
          className={`w-full border rounded-lg p-2 form-control input-control ${errors.matricule ? "border-red-500" : ""}`}
          placeholder="Entrer le matricule"
          onChange={handleChange}
          value={formData.matricule}
          required
          name="matricule"
        />
        {errors.matricule && <p className="text-red-500 text-sm mt-1">{errors.matricule}</p>}
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          className={`w-full border rounded-lg p-2 form-control input-control ${errors.mail ? "border-red-500" : ""}`}
          placeholder="email@gmail.com...."
          onChange={handleChange}
          value={formData.mail}
          required
          name="mail"
        />
        {errors.mail && <p className="text-red-500 text-sm mt-1">{errors.mail}</p>}
      </div>

      <div>
        <label>Fixe</label>
        <input
          type="tel"
          className={`w-full border rounded-lg p-2 form-control input-control ${errors.fixe ? "border-red-500" : ""}`}
          placeholder="Entrer le numéro fixe"
          onChange={handleChange}
          value={formData.fixe}
          required
          name="fixe"
        />
        {errors.fixe && <p className="text-red-500 text-sm mt-1">{errors.fixe}</p>}
      </div>

      <div>
        <label>Role</label>
        <select
          className={`w-full border rounded-lg p-2 form-control input-control ${errors.role ? "border-red-500" : ""}`}
          onChange={handleChange}
          value={formData.role}
          name="role"
        >
          <option value="">Sélectionner un rôle</option>
          <option value="Admin">Admin</option>
          <option value="Comptabilité">Comptabilité</option>
          <option value="Demandeur">Demandeur</option>
          <option value="Validateur">Validateur</option>
        </select>
        {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
      </div>

      <div>
        <label>Site</label>
        <input
          type="text"
          className={`w-full border rounded-lg p-2 form-control input-control ${errors.site ? "border-red-500" : ""}`}
          placeholder="Entrer le nom du site....."
          onChange={handleChange}
          value={formData.site}
          name="site"
        />
        {errors.site && <p className="text-red-500 text-sm mt-1">{errors.site}</p>}
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
  );
}

export default ListeUser;