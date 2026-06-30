import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5233/api",
  withCredentials:true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Intercepteur — ajoute le token automatiquement uniquement s'il existe
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("gestpr_user");

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // On n'injecte le Header Authorization QUE si un token JWT est explicitement présent
      if (parsed && parsed.token) {
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch (e) {
      console.error("Erreur de lecture du localStorage", e);
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// ✅ Intercepteur — si 401 → rediriger vers login
api.interceptors.response.use(
  (response) => response, 
  (error) =>  {
    if(error.response?.status === 401){
      localStorage.removeItem("gestpr_user");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const userService = {
  // Changement des routes pour pointer vers AuthController qui gère star_identity_db
  getAll: () => api.get("/Auth/utilisateurs/"),
  create: (data) => api.post("/Auth/utilisateurs", data),
  update: (id, data) => api.put(`/Auth/utilisateurs/${id}`, data),
  delete: (id) => api.delete(`/Auth/utilisateurs/${id}`), // Optionnel si vous gérez la suppression
  count: () => api.get("/Auth/utilisateurs/count/"), 
  idMatricule : () => api.get(`Auth/by-matricule/${matricule}`)
};

export const tauxService = {
  getAll: () => api.get("/taux/"),
  create: (data) => api.post("/taux/", data),
  update: (id, data) => api.put(`/taux/${id}`, data),
  delete: (id) =>api.delete(`/taux/${id}`),
  count: () => api.get("/taux/count/"),
};

export const frsService = {
  getAll: () => api.get("/frs"),
  create: (data) => api.post("/frs/", data),
  delete: (id) =>api.delete(`/frs/${id}`),
  update: (id, data) => api.put(`/frs/${id}`, data),
  count: () => api.get("/frs/count"),
};

export const origineService = {
  getAll: () => api.get("/origines/"),
  getById: (id) => api.get(`/origines/${id}`),
  create: (data) => api.post("/origines/", data),
  delete: (id) =>api.delete(`/origines/${id}`),
  update: (id, data) => api.put(`/origines/${id}`, data),
  count: () => api.get("/origines/count")
};


export const tauxHistoriqueService = {
  getAll: () => api.get("/tauxHistorique/"),
  // create: (data) => api.post("/tauxHistorique/", data),
 };

export const authService = {
   

  connexionAutomatiqueWindows:()=>api.get("/Auth/windows-login"),
}

export const demandeService = {
  getAll:  (idDemandeur) => api.get(`/demandes?idDemandeur=${idDemandeur}`),
  create:  (data)        => api.post("/demandes", data),
  get: () =>  api.get("/demandes/all"),
  getDemande : (idDemande) => api.get(`/demandes/${idDemande}`),
 };

export const articleService = {
  createBulk: (articles) => api.post("/articles/bulk", articles),
  getByDemande: (idDemande) => api.get(`/articles?idDemande=${idDemande}`)
};

export default api;