using System.Collections.Generic;
using Star.Security.Ldap.Models;

namespace Star.Security.Ldap.Services
{
    public interface ILdapAuthenticationService
    {
        string GetIdentityLogin(string loginWithDomain);
        bool AuthenticateUser(string username, string password);
        bool IsUserInGroup(string username, string groupName);
        LdapUser GetUserByUsername(string username);
        LdapUser GetUserByMatricule(string matricule);
        IEnumerable<LdapUser> GetAllUsers();
    }
}