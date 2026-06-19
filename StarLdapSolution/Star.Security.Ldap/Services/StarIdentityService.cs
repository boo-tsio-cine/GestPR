using System.Data.SqlClient; // ou Microsoft.Data.SqlClient
using System.Security.Principal;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Star.Security.Ldap
{
    public class StarIdentityService
    {
        private readonly string _connectionString;

        public StarIdentityService(IConfiguration configuration)
        {
            // La bibliothèque lira sa propre chaîne de connexion depuis le appsettings de l'API
            _connectionString = configuration.GetConnectionString("StarIdentityConnection");
        }

        public UserResult GetUserFromSession(HttpContext httpContext, string applicationName)
        {
            // 1. Récupérer le login Windows de la machine
            var windowsIdentity = httpContext.User.Identity as WindowsIdentity ?? WindowsIdentity.GetCurrent();
            if (windowsIdentity == null) return null;

            string username = windowsIdentity.Name.Contains("\\")
                ? windowsIdentity.Name.Split('\\')[1]
                : windowsIdentity.Name;

            // 2. Interroger directement la base centrale SQL Server
            using (var connection = new SqlConnection(_connectionString))
            {
                string query = @"SELECT Role, Nom, Prenom FROM ApplicationUsers 
                                 WHERE AdUsername = @username 
                                 AND ApplicationName = @appName 
                                 AND IsActive = 1";

                using (var command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@username", username);
                    command.Parameters.AddWithValue("@appName", applicationName);

                    connection.Open();
                    var role = command.ExecuteScalar() as string;

                    using (var reader = command.ExecuteReader()) {
                        if (reader.Read())
                        {
                            return new UserResult 
                            { 
                                Username = username, 
                                Role = reader["Role"].ToString(), 
                                Nom = reader["Nom"].ToString(), 
                                Prenom = reader["Prenom"].ToString(), 
                                IsAuthenticated = true 
                            };
                        }
                    }
                }
            }

            return new UserResult { Username = username, IsAuthenticated = false };
        }
    }

    public class UserResult
    {
        public string Username { get; set; }
        public string Role { get; set; }
        public string Nom { get; set; }
        public string Prenom { get; set; }
        public bool IsAuthenticated { get; set; }
    }
}