import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/api";

const ACCUEIL_PAR_ROLE = {
  Admin: "/home@admin",
  Demandeur: "/home@demandeur",
  Validateur: "/home@validateur",
  "Comptabilité": "/home@comptabilite",
};

function Login() {
  const [form, setForm] = useState({ matricule: "", pass: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await authService.connexion({
        matricule: form.matricule.trim(),
        pass: form.pass,
      });
      const role = response.data.role || response.data.Role;
      const destination = ACCUEIL_PAR_ROLE[role];
      if (!destination) {
        setError("Rôle utilisateur non reconnu.");
        return;
      }
      login(response.data);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Connexion impossible. Vérifiez la connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex min-vh-100 align-items-center justify-content-center bg-light">
      <form onSubmit={handleSubmit} className="card shadow-sm p-4" style={{ width: 380 }}>
        <h4 className="mb-1">Connexion GestPR</h4>
        <p className="text-muted small mb-3">Entrez votre matricule et votre mot de passe.</p>
        {error && <div className="alert alert-danger py-2">{error}</div>}

        <label className="form-label">Matricule</label>
        <input className="form-control mb-3" name="matricule" value={form.matricule}
               onChange={handleChange} required autoFocus />

        <label className="form-label">Mot de passe</label>
        <input type="password" className="form-control mb-3" name="pass" value={form.pass}
               onChange={handleChange} required />

        <button type="submit" className="btn btn-danger w-100" disabled={loading}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
        <p className="mt-3 mb-0 small text-center">
          Première connexion ? <Link to="/signup">Créer mon mot de passe</Link>
        </p>
      </form>
    </div>
  );
}

export default Login;