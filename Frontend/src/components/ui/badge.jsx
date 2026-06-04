"use client";
// Indispensable en Next.js App Router : ce composant utilise useState/useEffect ou des événements,
// donc il doit être marqué comme Client Component pour être rendu côté navigateur.

import React from "react";
// Import React pour supporter JSX et React.forwardRef.

// Dictionnaire des classes CSS par variante.
// Remplace class-variance-authority par un mapping simple et lisible.
const badgeStyles = {
  default:
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-blue-500 text-white",
  secondary:
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-gray-500 text-white",
  destructive:
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors border-transparent bg-red-500 text-white",
  outline:
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors text-black",
};

// Composant Badge avec support du ref (forwardRef).
// Permet aux parents d’accéder au DOM sous-jacent via une ref, utile pour les tests ou les mesures.
const Badge = React.forwardRef((props, ref) => {
  // Destructuration des props avec valeurs par défaut pour éviter les comportements indéfinis.
  const { className = "", variant = "default", children, ...rest } = props;

  // Récupération du style de base selon la variante, avec fallback sur "default" si la variante est invalide.
  const baseStyles = badgeStyles[variant] || badgeStyles.default;
  // Concaténation propre des classes : pas d’espace parasite si className est vide.
  const combinedClassName = `${baseStyles}${className ? ` ${className}` : ""}`;

  // Rendu du badge : div accessible via ref, classes combinées, enfants, et reste des props (id, aria-*, etc.).
  return (
    <div ref={ref} className={combinedClassName} {...rest}>
      {children}
    </div>
  );
});

// Nom d’affichage pour les outils de développement React (DevTools), améliore le debug.
Badge.displayName = "Badge";

// Export par défaut pour simplifier les imports dans les autres fichiers.
export default Badge;