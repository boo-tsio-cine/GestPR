import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { authService } from "../../services/api";
import "./signup.css";

function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    matricule: "",
    pass: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation côté client
    if (!form.matricule.trim()) {
      setError("Veuillez entrer votre matricule.");
      return;
    }
    if (!form.pass.trim()) {
      setError("Veuillez entrer un mot de passe.");
      return;
    }
    if (form.pass.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (form.pass !== form.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      await authService.inscription({
        matricule: form.matricule.trim(),
        password: form.pass,
      });

      navigate("/login", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 400) {
        if (typeof msg === "string") {
          if (msg.includes("déjà un mot de passe")) {
            setError("Ce compte existe déjà. Veuillez vous connecter.");
          } else if (msg.includes("n'est pas enregistré")) {
            setError("Ce matricule n'est pas reconnu. Contactez votre administrateur.");
          } else {
            setError(msg);
          }
        } else {
          setError("Inscription impossible. Vérifiez votre matricule.");
        }
      } else if (status === 404) {
        setError("Ce matricule n'existe pas. Contactez votre administrateur.");
      } else if (status === 500) {
        setError("Erreur serveur. Veuillez réessayer plus tard.");
      } else {
        setError("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="d-flex min-vh-100 flex-column justify-content-center align-items-center gap-4 px-3 text-center signup">
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <h1 className="fs-3 fw-bold mb-2">Créer mon mot de passe</h1>
        <p className="descri_log mb-4">
          Votre matricule doit déjà avoir été enregistré par l'administrateur.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Matricule</label>
            <input
              type="text"
              className="form-control"
              placeholder="Entrer votre matricule..."
              required
              maxLength={255}
              value={form.matricule}
              onChange={handleChange}
              name="matricule"
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Mot de passe</label>
            <div className="relative" style={{ display: "flex" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                name="pass"
                required
                maxLength={255}
                placeholder="Au moins 8 caractères..."
                value={form.pass}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label">Confirmer le mot de passe</label>
            <div className="relative" style={{ display: "flex" }}>
              <input
                type={showPasswords ? "text" : "password"}
                className="form-control"
                name="confirmPassword"
                required
                maxLength={255}
                placeholder="Confirmer votre mot de passe..."
                value={form.confirmPassword}
                onChange={handleChange}
              />
              <button
                type="button"
                onClick={() => setShowPasswords((prev) => !prev)}
              >
                {showPasswords ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn_signup w-100"
          >
            {loading ? "Création..." : "Créer mon mot de passe"}
          </button>
        </form>

        <p className="mt-3">
          Vous avez déjà un mot de passe ?{" "}
          <Link to="/login" className="text-decoration-none link_signup">
            Se connecter
          </Link>
        </p>
      </div>
    </section>
  );
}

export default SignupPage;