import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import { authService } from "../../services/api";
import "./signup.css";
// import "./demandeur.css";

const API_URL = import.meta.env.VITE_API_URL || "https://localhost:5001";

function SignupPage(){
  const navigate = useNavigate();

    const [form, setForm] = useState({
      matricule: "", pass: "",
      confirmPassword: ""
    });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  const [showPassword, setShowPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const handleChange= (e) => 
    setForm((f) => ({ ...f, [e.target.name]: e.target.value}));
  
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

    if(form.pass != form.confirmPassword){
      setError("Les mots de passes ne correspondent pas");
      return;
    }
    if (form.pass.length < 8) {
      setError("Les mots de passes sont trop courts");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.inscription({
        matricule: form.matricule,
        password:  form.password,
      }) 

      navigate("/login");

      // if(!res.ok){
      //   const msg = await res.text();
      //   throw new Error(msg || "Inscription échouée");
      // }
      // navigate("/login");
    }catch(err){
      // setError(err.message)
      const status = err.response?.status;
      const msg    = err.response?.data;

      // ✅ Messages clairs selon le code HTTP
      if (status === 400) {
        // Le backend retourne un texte — l'afficher directement
        if (typeof msg === "string") {
          if (msg.includes("déjà un mot de passe")) {
            setError("Ce compte existe déjà. Veuillez vous connecter.");
          } else if (msg.includes("n'est pas enregistré")) {
            setError("Ce matricule n'est pas reconnu. Contactez votre administrateur.");
          } else {
            setError(msg); // afficher le message du backend tel quel
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
    }finally{
      setLoading(false);
    }
  };

 return<>
    <section className="d-flex min-vh-100 flex-column justify-content-center align-items-center gap-4  px-3 text-center signup">
      <div className="w-100" style={{ maxWidth: "400px" }}>
        <h1 className="fs-3 fw-bold mb-2">Créer un compte</h1>
        <p className="descri_log mb-4">Heureux de vous voir ✨✨</p>

         <form onSubmit={handleSubmit}>

          
          

          <div className="mb-3">
            <label className="form-label">Matricule</label>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Entrer votre immatricule...." 
              required
              maxLength={255}
              value={form.matricule}
              onChange={handleChange}
              name="matricule"

            />
          </div>

          
          

          
          <div className="mb-3">
           <label className="form-label">Mot de passe</label>
            <div className="relative" style={{display:"flex"}}>
              <input 
                type={showPassword ? "text" : "password"}
                className="form-control" 
                name="pass" 
                required 
                maxLength={255}
                placeholder="Confirmer votre mot de passe ...." 
                value={form.pass}
                onChange={handleChange}
              />
                
              <button
              type="button"
                onClick={()=>setShowPassword((prev) => !prev)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            
            
          </div>

          <div className="mb-3">
            <label className="form-label">Confirmer le mot de passe</label>
            <div className="relative" style={{display:"flex"}}>
              <input 
                type={showPasswords ? "text" : "password"}
                className="form-control" 
                name="confirmPassword" 
                required 
                maxLength={255}
                placeholder="Confirmer votre mot de passe ...." 
                value={form.confirmPassword}
                onChange={handleChange}
              />
              <button
              type="button"
                onClick={()=>setShowPasswords((prev) => !prev)}
                
              >
                {showPasswords ? "🙈" : "👁️"}
              </button>
            </div>
            
          </div>

          {
            error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
            )
          }

          <button 
            type="submit"
            disabled={loading}
            className="btn btn_signup w-100 ">
              
            S'inscrire
          </button>

        </form>

        <p className="">
          Vous avez de compte ?{" "}
          <Link to="/login" className="text-decoration-none link_signup">Se connecter</Link>
        </p>
      </div>
    </section>
 </>
}

export default SignupPage;