using System;

namespace Star.Security.Ldap.Models
{
    public class LdapUser
    {
        public string SamAccountName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string Mail { get; set; } = string.Empty;
        public string EmployeeNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
    }

    public class LdapOptions
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string BaseDn { get; set; } = string.Empty;
        public string Domain { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty; // Forcé en minuscule "username"
        public string Password { get; set; } = string.Empty;
    }
}