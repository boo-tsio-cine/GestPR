FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

USER root

# Installation des dépendances
RUN apt-get update && apt-get install -y --no-install-recommends libgssapi-krb5-2 && rm -rf /var/lib/apt/lists/*

# Modifier le fichier OpenSSL par défaut en injectant SECLEVEL=0 dans la section system_default
RUN sed -i 's/CipherString = DEFAULT@SECLEVEL=2/CipherString = DEFAULT@SECLEVEL=0/g' /etc/ssl/openssl.cnf || true
RUN sed -i 's/CipherString = DEFAULT@SECLEVEL=1/CipherString = DEFAULT@SECLEVEL=0/g' /etc/ssl/openssl.cnf || true
RUN echo "openssl_conf = default_conf" > /tmp/openssl.cnf && \
    cat /etc/ssl/openssl.cnf >> /tmp/openssl.cnf && \
    mv /tmp/openssl.cnf /etc/ssl/openssl.cnf

# Copie des fichiers
COPY ./bin/Release/net8.0/publish/ .

USER app

EXPOSE 8080
EXPOSE 8081

ENTRYPOINT ["dotnet", "GestPR.dll"]