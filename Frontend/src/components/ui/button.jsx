"use client";
// Marque ce composant comme Client Component : requis pour les événements (clic, focus, etc.)
// et éviter les erreurs d’hydratation côté serveur dans Next.js App Router.

import * as React from "react";
import { cn } from "../lib/utils";

// Composant Button : bouton HTML stylisé avec variantes et tailles.
// Il encapsule les classes Tailwind pour garantir la cohérence visuelle dans toute l’application.
// Les variantes changent la palette de couleurs, les tailles ajustent la hauteur et le padding.
// Une ref est exposée vers l’élément <button> natif pour les tests ou les manipulations DOM.
const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  // Classes de base communes à tous les boutons : layout, transitions, états disabled/focus.
  const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  
  // Mapping des classes par variante visuelle.
  const variantClasses = {
    default: " text-primary-foreground hover:bg-primary/90",      // Primaire de l’application
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90", // Action dangereuse (supprimer, etc.)
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",       // Contour, fond transparent
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",         // Secondaire, moins important
    ghost: "hover:bg-accent hover:text-accent-foreground",                             // Invisible tant qu’on ne survole pas
    link: "underline-offset-4 hover:underline text-primary",                           // Style lien de texte
  };

  // Mapping des classes par taille.
  const sizeClasses = {
    default: "h-10 py-2 px-4",       // Taille standard
    sm: "h-9 px-3 rounded-md",       // Petit
    lg: "h-11 px-8 rounded-md",      // Grand
  };

  // Fusion des classes : base + variante + taille + classes custom passées par l’utilisateur.
  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button"; // Nom d’affichage dans les DevTools React.

export { Button };