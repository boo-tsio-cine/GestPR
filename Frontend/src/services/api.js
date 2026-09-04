import axios from "axios";
import { toast } from "sonner";

// --- CONFIGURATION DES ADRESSES API ---
const IS_PRODUCTION = window.location.hostname !== "localhost";

// Laisse vide ("") si ton API déployée utilise le port par défaut (80 / 443).
// Si ton IIS de production utilise un port spécifique (ex: 8080), écris : const PROD_PORT = ":8080";
const PROD_PORT = ""; 

const API_URL = IS_PRODUCTION 
  ? `http://${window.location.hostname}${PROD_PORT}/api` // URL dynamique de production
  : "http://localhost:5005/api";                        // URL locale de test

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// récupération renaissance
const RENAISSANCE_BASE_URL = 'http://apierp.star.mg/ApiRenaissance';
const CLE_API = 'lacleSecreteStarAPIRenaissancev1'; // Clé API distante

let cachedToken = null;

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
  (response) => {
    // Si le backend utilise le format ApiResponse<T>
    if(response.data && typeof response.data === 'object' && 'success' in response.data) {
      if (!response.data.success) {
        toast.error(response.data.message || "Une erreur est survenue.");
        return Promise.reject(response.data);
      }
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem("gestpr_user");
        toast.error("Session expirée ou non autorisée.");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // Extraction du message d'erreur du backend (ApiResponse ou ExceptionMiddleware)
      const serverMessage = data?.message || data?.Message || null;

      if (status === 400 && data?.errors && Array.isArray(data.errors)) {
        // Erreurs de validation ModelState
        data.errors.forEach((err) => toast.error(err));
      } else if (serverMessage) {
        toast.error(serverMessage);
      } else if (status === 403) {
        toast.error("Accès refusé : Vous n'avez pas les permissions requises.");
      } else if (status === 404) {
        toast.error("La ressource demandée est introuvable.");
      } else if (status === 500) {
        toast.error("Une erreur interne du serveur est survenue.");
      } else {
        toast.error(`Erreur HTTP (${status})`);
      }
    } else if (error.request) {
      toast.error("Impossible de contacter le serveur backend. Vérifiez le réseau.");
    } else {
      toast.error(error.message || "Une erreur inattendue est survenue.");
    }

    return Promise.reject(error);
  }
);

// --- SERVICES DE L'APPLICATION (DÉCLARÉS UNE SEULE ET UNIQUE FOIS) ---

export const userService = {
  getAll: () => api.get("/Auth/utilisateurs/"),
  create: (data) => api.post("/Auth/utilisateurs", data),
  update: (id, data) => api.put(`/Auth/utilisateurs/${id}`, data),
  delete: (id) => api.delete(`/Auth/utilisateurs/${id}`), 
  count: () => api.get("/Auth/utilisateurs/count/"), 
  idMatricule: (matricule) => api.get(`/Auth/by-matricule/${matricule}`)
};

export const tauxService = {
  getAll: () => api.get("/taux/"),
  create: (data) => api.post("/taux/", data),
  update: (id, data) => api.put(`/taux/${id}`, data),
  delete: (id) => api.delete(`/taux/${id}`),
  count: () => api.get("/taux/count/"),
};

export const frsService = {
  getAll: () => api.get("/frs"),
  create: (data) => api.post("/frs/", data),
  delete: (id) => api.delete(`/frs/${id}`),
  update: (id, data) => api.put(`/frs/${id}`, data),
  count: () => api.get("/frs/count"),
};

export const origineService = {
  getAll: () => api.get("/origines/"),
  getById: (id) => api.get(`/origines/${id}`),
  create: (data) => api.post("/origines/", data),
  delete: (id) => api.delete(`/origines/${id}`),
  update: (id, data) => api.put(`/origines/${id}`, data),
  count: () => api.get("/origines/count")
};

export const tauxHistoriqueService = {
  getAll: () => api.get("/tauxHistorique/"),
};

// Lecture du dernier cours de change saisi, mis en cache Redis (voir CoursChangeService.cs)
export const coursChangeService = {
  getDernierCours: (devise) => api.get(`/coursChange/${encodeURIComponent(devise)}`),
};

export const authService = {
  connexionAutomatiqueWindows: () => api.get("/Auth/windows-login"),
};

export const demandeService = {
  getAll: (idDemandeur) => api.get(`/demandes?idDemandeur=${idDemandeur}`),
  create: (data) => api.post("/demandes", data),
  get: () => api.get("/demandes/all"),
  getDemande: (idDemande) => api.get(`/demandes/${idDemande}`),

  soumettreTraitement: (id, formData) => api.post(`/demandes/${id}/soumettre`, formData, {
      headers: {
          "Content-Type": "multipart/form-data"
      }
  }),

  getHistoriqueByDesignation: (designation) => api.get(`/demandes/historique/${encodeURIComponent(designation)}`),
  updateStatus: (id, status, motif) => api.put(`/demandes/${id}/status`, { status, motif }),

  getAuditLogs: (id)=> api.get(`/demandes/${id}/audit`),
};

export const articleService = {
  createBulk: (articles) => api.post("/articles/bulk", articles),
  getByDemande: (idDemande) => api.get(`/articles?idDemande=${idDemande}`)
};


// Analyse d'anomalie sur un prix de revient (voir AnomalyDetectionService.cs)
export const anomalyService = {
  analyserPrix: (designation, codeLot, prixDeRevient) => 
    api.post("/AnomalyDetection/analyser", { designation, codeLot, prixDeRevient },)
};


// Renaissance
// Renaissance
export const directRenaissanceService = {
    // 1. Récupération du Token depuis l'ERP distant
    getToken: async () => {
        if (cachedToken) return cachedToken;

        const formData = new FormData();
        formData.append('cleAPI', CLE_API);

        const response = await axios.post(`${RENAISSANCE_BASE_URL}/Token`, formData);
        
        // Extraction du token (selon la structure de réponse Renaissance)
        cachedToken = response.data?.Value || response.data?.token || response.data;
        return cachedToken;
    },

    // 2. Appel direct à http://apierp.star.mg/ApiRenaissance/Articles
    getArticlesByCode: async (codeArticle, codeMagasin = 'S4', codeSociete = 'A') => {
        try {
            const token = await directRenaissanceService.getToken();

            const response = await axios.get(`${RENAISSANCE_BASE_URL}/Articles`, {
                params: {
                    codeArticle: codeArticle,
                    codeMagasin: codeMagasin,
                    codeSociete: codeSociete
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            // Si le token a expiré (401), on vide le cache et on réessaie une fois
            if (error.response && error.response.status === 401) {
                cachedToken = null;
                const newToken = await directRenaissanceService.getToken();
                const retryResponse = await axios.get(`${RENAISSANCE_BASE_URL}/Articles`, {
                    params: { codeArticle: codeArticle, codeMagasin: codeMagasin, codeSociete: codeSociete },
                    headers: { Authorization: `Bearer ${newToken}` }
                });
                return retryResponse.data;
            }
            throw error;
        }
    }, // <-- AJOUT DE LA VIRGULE ICI

    // 3. Appel direct à http://apierp.star.mg/ApiRenaissance/Produit
    getProduitBycode: async (codeProduit, codeMagasin = 'S4', codeSociete = 'A') => {
        try {
            const token = await directRenaissanceService.getToken();

            const response = await axios.get(`${RENAISSANCE_BASE_URL}/Produit`, {
                params: {
                    codeProduit: codeProduit,
                    codeMagasin: codeMagasin,
                    codeSociete: codeSociete
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 401) {
                cachedToken = null;
                const newToken = await directRenaissanceService.getToken();
                const retryResponse = await axios.get(`${RENAISSANCE_BASE_URL}/Produit`, {
                    params: { codeProduit: codeProduit, codeMagasin: codeMagasin, codeSociete: codeSociete },
                    headers: { Authorization: `Bearer ${newToken}` }
                });
                return retryResponse.data;
            }
            throw error;
        }
    }
};
export default api;