# # ==========================================
# # Étape 1 : Build de l'application React / Vite
# # ==========================================
# FROM node:22-alpine AS build
# WORKDIR /app

# # Copie des définitions
# COPY package*.json ./

# # Réglage du réseau / mémoire de NPM et installation
# RUN npm ci --network-timeout=1000000 || npm install

# # Copie du reste du code source
# COPY . .

# # Build de production
# RUN npm run build

# # ==========================================
# # Étape 2 : Serveur NGINX pour les fichiers statiques
# # ==========================================
# FROM nginx:alpine AS final
# COPY --from=build /app/dist /usr/share/nginx/html
# # Copie de la config Nginx si vous en avez une (ex: default.conf)
# # COPY nginx.conf /etc/nginx/conf.d/default.conf

# COPY dist /usr/share/nginx/html

# EXPOSE 80
# CMD ["nginx", "-g", "daemon off;"]


FROM nginx:alpine

COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]