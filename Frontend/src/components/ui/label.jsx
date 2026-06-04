import React from "react";

// Composant Label accessible et stylisé pour les formulaires.
// Il remplace la balise <label> native standard en ajoutant des classes Tailwind cohérentes
// avec le design system (taille de texte, graisse, interligne).
// Supporte une ref vers l’élément DOM natif via React.forwardRef pour les tests ou les manipulations directes.
const Label = React.forwardRef(
    ({
        className = "", // Classes supplémentaires à fusionner avec le style de base.
        children,       // Contenu textuel du label, généralement le nom du champ.
        ...props        // Autres attributs HTML standards (htmlFor, id, etc.).
    }, ref)=>{
        return (
            <label
                ref={ref} // Référence vers l’élément DOM pour un usage externe (focus, mesure, etc.).
                className={`text-sm font-medium leading-none ${className}`} // Classes de base + classes custom.
                {...props} // Transmission des attributs natifs (ex: htmlFor="email").
            >
                {children}
            </label>
        );
    }
);


Label.displayName = "Label"; // Nom d’affichage dans les DevTools React pour faciliter le debug.

export default Label;