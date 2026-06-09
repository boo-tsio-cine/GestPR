import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Intercepteur — ajoute le token automatiquement à chaque requête
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem("gestpr_user");

  if(stored) {
    const { token } = JSON.parse(stored);
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;

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
  getAll: () => api.get("/utilisateurs/"),
  create: (data) => api.post("/utilisateurs/", data),
  update: (id, data) => api.put(`/utilisateurs/${id}`, data),
  delete: (id) =>api.delete(`/utilisateurs/${id}`),
};


export const tauxService = {
  getAll: () => api.get("/taux/"),
  create: (data) => api.post("/taux/", data),
  update: (id, data) => api.put(`/taux/${id}`, data),
  delete: (id) =>api.delete(`/taux/${id}`),
};

export const frsService = {
  getAll: () => api.get("/frs/"),
  create: (data) => api.post("/frs/", data),
  delete: (id) =>api.delete(`/frs/${id}`),
  update: (id, data) => api.put(`/frs/${id}`, data),

};

export const origineService = {
  getAll: () => api.get("/origines/"),
  getById: (id) => api.get(`/origines/${id}`),
  create: (data) => api.post("/origines/", data),
  delete: (id) =>api.delete(`/origines/${id}`),
  update: (id, data) => api.put(`/origines/${id}`, data),

};


export const tauxHistoriqueService = {
  getAll: () => api.get("/tauxHistorique/"),
  // create: (data) => api.post("/tauxHistorique/", data),
 };

export const authService = {
   // Inscription — première connexion
  inscription: (data) => api.post("/auth/inscription", data),

  // Connexion — retourne le token JWT
  connexion: (data) => api.post("/auth/connexion", data),
}

export const demandeService = {
  getAll:  (idDemandeur) => api.get(`/demandes?idDemandeur=${idDemandeur}`),
  create:  (data)        => api.post("/demandes", data),
};

export const articleService = {
  createBulk: (articles) => api.post("/articles/bulk", articles),
  getByDemande: (idDemande) => api.get(`/articles?idDemande=${idDemande}`)
};

export default api;