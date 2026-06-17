using System;
using System.Collections.Generic;
using System.DirectoryServices;
using System.DirectoryServices.AccountManagement;
using System.Linq;
using Microsoft.Extensions.Options;
using Star.Security.Ldap.Models;

namespace Star.Security.Ldap.Services
{
    public class LdapAuthenticationService : ILdapAuthenticationService
    {
        private readonly LdapOptions _options;

        public LdapAuthenticationService(IOptions<LdapOptions> options)
        {
            _options = options.Value;
        }

        public string GetIdentityLogin(string loginWithDomain)
        {
            if (string.IsNullOrEmpty(loginWithDomain)) return string.Empty;
            return loginWithDomain.Split('\\').Last();
        }

        public bool AuthenticateUser(string username, string password)
        {
            try
            {
                using (var context = new PrincipalContext(ContextType.Domain, _options.Domain))
                {
                    return context.ValidateCredentials(username, password);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LDAP Auth Error] : {ex.Message}");
                return false;
            }
        }

        public bool IsUserInGroup(string username, string groupName)
        {
            try
            {
                using (var context = new PrincipalContext(ContextType.Domain, _options.Domain))
                {
                    using (var user = UserPrincipal.FindByIdentity(context, username))
                    {
                        if (user == null) return false;
                        return user.IsMemberOf(context, IdentityType.Name, groupName);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LDAP Group Error] : {ex.Message}");
                return false;
            }
        }

        public LdapUser GetUserByUsername(string username)
        {
            var searchResult = ExecuteSearch($"(&(SAMAccountName={username}))",
                new[] { "employeeNumber", "mail", "displayName", "title", "SAMAccountName" });

            return searchResult != null ? MapToLdapUser(searchResult) : null;
        }

        public LdapUser GetUserByMatricule(string matricule)
        {
            var searchResult = ExecuteSearch($"(&(employeeNumber={matricule}))",
                new[] { "employeeNumber", "mail", "displayName", "title", "SAMAccountName" });

            if (searchResult == null)
                throw new Exception("Utilisateur non trouvé dans l'AD via son matricule.");

            return MapToLdapUser(searchResult);
        }

        public IEnumerable<LdapUser> GetAllUsers()
        {
            var users = new List<LdapUser>();
            string filter = "(&(displayname=*)(mail=*.*@castel-afrique.com)(!(userAccountControl=514)))";

            try
            {
                using (var de = CreateDirectoryEntry())
                using (var deSearch = new DirectorySearcher(de))
                {
                    deSearch.Filter = filter;
                    deSearch.PropertiesToLoad.AddRange(new[] { "displayName", "mail", "title", "SAMAccountName", "employeeNumber" });
                    deSearch.SearchScope = SearchScope.Subtree;

                    using (var results = deSearch.FindAll())
                    {
                        foreach (SearchResult result in results)
                        {
                            users.Add(MapToLdapUser(result));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LDAP FindAll Error] : {ex.Message}");
            }
            return users;
        }

        // Méthodes d'aide privées (Helpers)
        private DirectoryEntry CreateDirectoryEntry()
        {
            string path = $"{_options.ConnectionString.TrimEnd('/')}/{_options.BaseDn}";
            return new DirectoryEntry(path, _options.Username, _options.Password)
            {
                AuthenticationType = AuthenticationTypes.Secure
            };
        }

        private SearchResult ExecuteSearch(string filter, string[] propertiesToLoad)
        {
            try
            {
                using (var de = CreateDirectoryEntry())
                using (var deSearch = new DirectorySearcher(de))
                {
                    deSearch.Filter = filter;
                    deSearch.PropertiesToLoad.AddRange(propertiesToLoad);
                    deSearch.SearchScope = SearchScope.Subtree;
                    return deSearch.FindOne();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LDAP Search Error] : {ex.Message}");
                return null;
            }
        }

        private LdapUser MapToLdapUser(SearchResult result)
        {
            return new LdapUser
            {
                SamAccountName = result.Properties.Contains("SAMAccountName") ? result.Properties["SAMAccountName"][0].ToString() : string.Empty,
                DisplayName = result.Properties.Contains("displayName") ? result.Properties["displayName"][0].ToString() : string.Empty,
                Mail = result.Properties.Contains("mail") ? result.Properties["mail"][0].ToString() : string.Empty,
                EmployeeNumber = result.Properties.Contains("employeeNumber") ? result.Properties["employeeNumber"][0].ToString() : string.Empty,
                Title = result.Properties.Contains("title") ? result.Properties["title"][0].ToString() : string.Empty
            };
        }
    }
}