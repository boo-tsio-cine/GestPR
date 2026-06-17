using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Star.Security.Ldap.Models;
using Star.Security.Ldap.Services;

namespace Star.Security.Ldap
{
    public static class LdapServiceCollectionExtensions
    {
        public static IServiceCollection AddStarLdapAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var ldapSection = configuration.GetSection("LdapSettings");
            services.Configure<LdapOptions> (ldapSection);
            services.AddScoped<ILdapAuthenticationService, LdapAuthenticationService>();
            return services;
        }
    }
}