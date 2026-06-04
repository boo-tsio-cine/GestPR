import React from "react"
import { cn } from "../lib/utils";

// Composants de carte (Card) : conteneurs visuels pour grouper du contenu relié (titre, description, actions).
// Chaque bloc est un <div> stylisé et expose une ref via React.forwardRef pour les tests ou mesures DOM.
// className permet de surcharger ou compléter les styles Tailwind par défaut.

// Carte principale : encadré avec ombre, bordure arrondie et fond adapté au thème.
const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl  bg-card text-card-foreground shadow", className)}
    {...props}
  />
));
Card.displayName = "Card";

// En-tête de carte : zone supérieure pour le titre et la description.
// Layout vertical, padding généreux et espacement entre les lignes.
const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// Description de carte : conteneur pour un texte descriptif sous le titre.
// Partage le même style que CardHeader pour la cohérence visuelle.
const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// Contenu de carte : corps principal qui reçoit paragraphes, listes, tableaux, etc.
// pt-0 supprime le padding haut pour éviter les doublons quand CardHeader est présent.
const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

// Pied de carte : zone inférieure destinée aux actions (boutons, liens).
// Alignement horizontal, centré verticalement, avec padding standard.
const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

const CardTitle = React.forwardRef(({ className = "", ...props }, ref) => (
  <div
    ref={ref}
    className={`font-semibold ${className}`}
    {...props}
  />
));

CardTitle.displayName = "CardTitle";



export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
// import React from "react";

// const Card = React.forwardRef(({ className = "", ...props }, ref) => (
//   <div
//     ref={ref}
//     className={`rounded-xl border shadow ${className}`}
//     {...props}
//   />
// ));

// Card.displayName = "Card";

// const CardHeader = React.forwardRef(({ className = "", ...props }, ref) => (
//   <div
//     ref={ref}
//     className={`flex flex-col p-6 ${className}`}
//     {...props}
//   />
// ));

// CardHeader.displayName = "CardHeader";

// const CardTitle = React.forwardRef(({ className = "", ...props }, ref) => (
//   <div
//     ref={ref}
//     className={`font-semibold ${className}`}
//     {...props}
//   />
// ));

// CardTitle.displayName = "CardTitle";

// const CardDescription = React.forwardRef(({ className = "", ...props }, ref) => (
//   <div
//     ref={ref}
//     className={`text-sm text-gray-500 ${className}`}
//     {...props}
//   />
// ));

// CardDescription.displayName = "CardDescription";

// const CardContent = React.forwardRef(({ className = "", ...props }, ref) => (
//   <div
//     ref={ref}
//     className={`p-6 pt-0 ${className}`}
//     {...props}
//   />
// ));

// CardContent.displayName = "CardContent";

// const CardFooter = React.forwardRef(({ className = "", ...props }, ref) => (
//   <div
//     ref={ref}
//     className={`flex items-center p-6 pt-0 ${className}`}
//     {...props}
//   />
// ));

// CardFooter.displayName = "CardFooter";

// export {
//   Card,
//   CardHeader,
//   CardTitle,
//   CardDescription,
//   CardContent,
//   CardFooter,
// };