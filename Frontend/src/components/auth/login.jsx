import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/api";
import { useRef } from "react";
import "./signup.css";

function Login() {
    const [form, setForm] = useState({
       matricule: "",pass: "",
    });

    const navigate = useNavigate();
    const { login } = useAuth();

    
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState("");

    const errorTimerRef = useRef(null);

    const location = useLocation();
    
    // Récupérer la page que l'utilisateur voulait accéder
    const from = location.state?.from?.pathname;


    

    useEffect(() => {
      if (error) {
        errorTimerRef.current = setTimeout(() => setError(""), 10000);
      }

      return () => {
        if (errorTimerRef.current) {
          clearTimeout(errorTimerRef.current);
        }
      };
    }, [error]);


    const [showPassword, setShowPassword] = useState(false);

    const handleChange= (e) => 
      setForm((f) => ({ ...f, [e.target.name]: e.target.value}));

    const handleSubmit = async(e) => {
      e.preventDefault();
      setError("");
      setLoading(true);


      // ✅ AJOUTER ICI — validation avant l'appel API
      if(!form.matricule.trim() || !form.password.trim()){
        setError("Veuillez remplir tous les champs.")
      }

      setLoading(true);

      try{
        const res = await authService.connexion({
          matricule: form.matricule,
          password:  form.password,
        });

        

        const data = res.data;
         // data = { token, role, nom, prenom, matricule }

        // Sauvegarder la session
        login(data);

        // ✅ Rediriger vers la page demandée OU la page par défaut
        if (from && from !== "/login") {
          navigate(from, { replace: true });
        } else {
          switch (data.role) {
            case "Admin":         navigate("/home@admin");        break;
            case "Demandeur":     navigate("/home@demandeur");    break;
            case "Validateur":    navigate("/home@validateur");   break;
            case "Comptabilité":  navigate("/home@comptabilite"); break;
            default:              navigate("/login");
          }
        }


      }catch (err){
        const status = err.response?.status;
        const msg = err.response?.data;

        // ✅ Messages selon le code HTTP retourné par le backend
        if(status === 400){
          // Pas encore de mot de passe → rediriger vers inscription
          setError("Vous n'avez pas encore de mot de passe. Veuillez vous inscrire.");
        } else if (status === 401) {
          // Mot de passe incorrect ou matricule introuvable
          setError("Matricule ou mot de passe incorrect.");
        } else if (status === 404) {
      // Matricule inexistant
          setError("Ce matricule n'existe pas. Contactez l'administrateur.");
        } else {
          setError(typeof msg === "string" ? msg : "Une erreur est survenue. Réessayez.");
        }

      }finally{
        setLoading(false);
      }
    };

    const [touched, setTouched] = useState({ matricule: false, password: false });

      const handleBlur = (e) =>
        setTouched((t) => ({ ...t, [e.target.name]: true }));
  
  return (
    <section className="d-flex min-vh-100 flex-column justify-content-center align-items-center gap-4 signup px-3 text-center">
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <h1 className="fs-3 fw-bold mb-2">Connexion😁😁</h1>
        <p className="descri_log mb-4">Heureux de vous revoir</p>

        <form action="" className="text-start" onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="matricule" className="form-label">Matricule</label>
            <input 
              type="text" 
              id="matricule" 
              name="matricule" 
              className="form-control" 
              value={form.matricule}
              onChange={handleChange}
              onBlur={handleBlur}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">Mot de passe</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"}   className="form-control" 
                name="password" 
                required 
                maxLength={255}
                placeholder="Confirmer votre mot de passe ...." 
                value={form.password}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <button
                type="button"
                onClick={()=>setShowPassword((prev)=>!prev)}
              >
                {showPassword ?  "🙈" : "👁️"}
              </button>
            </div>
          </div>


          {/* Erreur */}

          {
            error && (
              <div className="alert alert-danger py-2" role="alert">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )
          }

          {/* Submit */}
          <button 
            type="submit" 
            className="btn btn_signup w-100 mb-3"
            disabled={loading}
          >
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>

        <p className="">
          Pas encore de mot de passe ?{" "}
          <Link to="/signup" className="text-decoration-none link_signup">S'inscrire</Link>
        </p>
      </div>
    </section>
  )
}

export default Login
