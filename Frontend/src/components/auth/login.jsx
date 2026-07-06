import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/api";

function Login() {
  const [form, setForm] = useState({ matricule: "", pass: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // 1. On envoie le matricule et le mot de passe à l'API C#
      const response = await authService.connexion({
        matricule: form.matricule.trim(),
        pass: form.pass
      });
      
      // 2. Si l'API répond OK, on enregistre l'utilisateur dans le Contexte (et le localStorage)
      login(response.data); 

      // 3. On redirige immédiatement selon le rôle reçu
      const userRole = response.data.role || response.data.Role;
      if (userRole === "Admin") {
        navigate("/home@admin", { replace: true });
      } else if (userRole === "Demandeur") {
        navigate("/home@demandeur", { replace: true });
      } else {
        setError("Rôle utilisateur non reconnu.");
      }

    } catch (err) {
      console.error(err);
      setError("Connexion échouée. Vérifiez vos identifiants ou la connexion au serveur API.");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "50px auto", padding: "20px", border: "1px solid #ccc" }}>
      <h2>Connexion GestPR</h2>
      {error && <div style={{ color: "red", marginBottom: "15px" }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Matricule :</label>
          <input 
            type="text" 
            name="matricule" 
            className="form-control"
            value={form.matricule} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Mot de passe :</label>
          <input 
            type="password" 
            name="pass" 
            className="form-control"
            value={form.pass} 
            onChange={handleChange} 
            required 
          />
        </div>
        <button type="submit" className="btn btn-primary w-100">Se connecter</button>
      </form>
    </div>
  );
}

export default Login;