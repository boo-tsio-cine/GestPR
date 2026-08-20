FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

# Installation de la dépendance native Kerberos/GSS-API — AVANT USER app (droits root nécessaires)
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*

USER app
EXPOSE 8080
EXPOSE 8081

# Copie directe du contenu publié depuis le PC hôte
COPY ./bin/Release/net8.0/publish/ .

ENTRYPOINT ["dotnet", "GestPR.dll"]