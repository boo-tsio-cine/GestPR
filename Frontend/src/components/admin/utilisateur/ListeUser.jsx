import { Link, useNavigate } from "react-router-dom";
import CrudPage from "../../../page/crud_page";
import { useEffect, useState } from "react";
import DialogPage from "../../../page/dialog_page";
import { Button } from "../../../components/ui/button";
import "./ListeUser.css";
import { userService } from "../../../services/api";
import Nav from "../../nav/nav";
import { useAuth } from "../../../context/AuthContext";

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

  // 🛠️ CORRECTION 1 : Remplacement de "number" par "text" ou "tel" pour éviter le blocage HTML5
  const fieldsTypes = {
        nom:        { type: "input",  inputType: "text"   },
        prenom:     { type: "input",  inputType: "text"   },
        matricule:  { type: "input",  inputType: "text" }, // <-- Corrigé (tsio700529 a des lettres)
        mail:       { type: "input",  inputType: "text"},  // <-- Corrigé pour la modification inline
        fixe:       { type: "input",  inputType: "tel"   }, // <-- "tel" accepte les espaces ou caractères sans bugger
        role:       { type: "select", options: ["Admin", "Comptabilité", "Demandeur", "Validateur"]},
        site:       { type: "input",  inputType: "text"   },
    };
  
  const [isOpen, setIsOpen] = useState(false);
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
    } catch (err) {
      console.error("Erreur API:", err);
    } finally {
      setLoading(false);
    }
  } 
  
  useEffect (() => {
    fetchUtilisateurs();
  }, []);

  const handleSuccess = (message) => {
    setIsOpen(false);
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
    fetchUtilisateurs();
  };

  // DELETE
  const handleDelete = async (id) => {
    console.log("Id à supprimer : ", id)
    if (!id) {
      console.error("ID manquant !");
      return;
    }

    const confirme = window.confirm("Voulez-vous vraiment supprimer cet enregistrement ?");
    if (!confirme) return;

    try {
      await userService.delete(id);
      setNotification("Suppression effectuée avec succès !");
      setTimeout(() => setNotification(null), 3000);
      fetchUtilisateurs();
    } catch(err) {
      console.error("Erreur de suppression : " , err.response?.data);
      setNotification("Erreur lors de la suppression.");
    }
  }
  
  // UPDATE inline
  const [editingId, setEditingId] = useState(null); 
  const [editData, setEditData] = useState({}); 

  const handleEdit = (ligne) => {
      setEditingId(ligne.id);
      // On extrait la partie avant le @ pour l'input mailPrefix
      const prefix = ligne.mail ? ligne.mail.split('@')[0] : "";
      setEditData({
        ...ligne,
        mailPrefix: prefix // On injecte le préfixe attendu par l'API C#
      });
  };

  const handleEditChange = (e) => {
      const { name, value } = e.target;
      setEditData(prev => {
        const updated = { ...prev, [name]: value };
        // Si l'utilisateur modifie le champ mail, on met à jour le mailPrefix
        if (name === "mail") {
          updated.mailPrefix = value.split('@')[0];
        }
        return updated;
      });
  };

  // Clic sur ✅ — Sauvegarde
  const handleSave = async () => {
      try {
          // 🛠️ CORRECTION 2 : Mappage des propriétés pour correspondre EXACTEMENT au NewUserDto C#
          const dataToSend = {
              nom: editData.nom,
              prenom: editData.prenom,
              matricule: editData.matricule,
              role: editData.role,
              mailPrefix: editData.mailPrefix, // <-- Corrigé ! Envoyé comme attendu par le backend C#
              fixe: editData.fixe,
              site: editData.site
          };

          await userService.update(editingId, dataToSend);
          setNotification("Utilisateur modifié avec succès !");
          setTimeout(() => setNotification(null), 3000);
          setEditingId(null); 
          fetchUtilisateurs(); 
      } catch (err) {
          console.error("Erreur de mise à jour utilisateur:", err.response?.data);
          setNotification("Erreur lors de la modification de l'utilisateur.");
      }
  };

  const handleCancel = () => {
      setEditingId(null);
      setEditData({});
  };

  const { logout } = useAuth();
  const navigate = useNavigate();

  return <>
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
    <div style={{ paddingTop:"5rem" }}>
      <Link to={"/home@admin"}>Retour</Link>
      <Button onClick={()=>setIsOpen(true)}>Insérer</Button>
    </div>
   
    {notification && (
      <div className="mb-4 p-4 bg-green-500 text-white rounded-lg shadow-lg text-center">
        {notification}
      </div>
    )}
        
    {loading && <p>Chargement...</p>}
    {error   && <p className="text-red-500">{error}</p>}
    {!loading && !error && (
      <CrudPage 
                keyMapping={keyMapping} 
                headers={tete} 
                data={utilisateurs} 
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSave={handleSave}
                onCancel={handleCancel}
                editingId={editingId}
                editData={editData}
                onEditChange={handleEditChange}
                fieldsTypes={fieldsTypes}
            />
    )}
  </>          
}

function UserForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    matricule: "",
    mailPrefix: "", // 🛠️ Harmonisé avec l'API C#
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
      setFormData({ 
          nom: "",
          prenom: "",
          matricule: "",
          mailPrefix: "",
          fixe: "",
          role: "",
          site: "",
      });
      if (onSuccess) onSuccess("Personne enregistrée avec succès !");
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
          className="w-full border rounded-lg p-2 form-control input-control"
          placeholder="Entrer le nom"
          onChange={handleChange}
          value={formData.nom}
          required
          name="nom"
        />
      </div>

      <div>
        <label>Prénom</label>
        <input
          type="text"
          className="w-full border rounded-lg p-2 form-control input-control"
          placeholder="Entrer le prenom"
          onChange={handleChange}
          value={formData.prenom}
          required
          name="prenom"
        />
      </div>

      <div>
        <label>Matricule</label>
        <input
          type="text" // 🛠️ Changé de "number" à "text" pour tsio700529
          className="w-full border rounded-lg p-2 form-control input-control"
          placeholder="Entrer le matricule"
          onChange={handleChange}
          value={formData.matricule}
          required
          name="matricule"
        />
      </div>

      <div>
        <label>Email (Uniquement l'identifiant avant @)</label>
        <div className="flex items-center border rounded-lg p-1 bg-white form-control input-control">
          <input
            type="text"
            className="w-full p-1 outline-none"
            placeholder="tsiory.randrianomenjanahary"
            onChange={handleChange}
            value={formData.mailPrefix}
            required
            name="mailPrefix"
          />
          <span className="text-gray-500 px-2 font-semibold">@castel-afrique.com</span>
        </div>
      </div>

      <div>
        <label>Fixe</label>
        <input
          type="text"
          className="w-full border rounded-lg p-2 form-control input-control"
          placeholder="Entrer le numéro fixe"
          onChange={handleChange}
          value={formData.fixe}
          required
          name="fixe"
        />
      </div>

      <div>
        <label>Role</label>
        <select
          className="w-full border rounded-lg p-2 form-control input-control"
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
      </div>

      <div>
        <label>Site</label>
        <input
          type="text"
          className="w-full border rounded-lg p-2 form-control input-control"
          placeholder="Entrer le nom du site....."
          onChange={handleChange}
          value={formData.site}
          name="site"
        />
      </div>

      <Button type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Enregistrement..." : "Enregistrer"}
      </Button>

      {message && status === "error" && (
        <p className="text-red-500 bg-white p-2 rounded">{message}</p>
      )}
    </form>
  );
}
export default ListeUser;