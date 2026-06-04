"use client";
// Composant Dialog (modale) basé sur @radix-ui/react-dialog.
// Fournit une modale accessible avec overlay, fermeture par clic extérieur, touche Échap et bouton fermer.
// Tous les sous-composants sont exportés pour composer une modale complète.

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "../lib/utils";

// Racine du Dialog : gère l’état ouvert/fermé de la modale.
const Dialog = DialogPrimitive.Root;

// Déclencheur : élément qui ouvre la modale au clic (bouton, lien, etc.).
const DialogTrigger = DialogPrimitive.Trigger;

// Portail : permet de rendre le contenu de la modale à la fin du <body> pour éviter les z-index cassés.
const DialogPortal = DialogPrimitive.Portal;

// Bouton de fermeture explicite (croix ou autre).
const DialogClose = DialogPrimitive.Close;

// Overlay : fond sombre semi-transparent derrière la modale.
// Animé avec data-[state=open/closed] pour des transitions fluides (fade in/out).
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:backdrop-blur-sm",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Contenu principal de la modale : fenêtre centrée avec animation de zoom.
// Inclut un bouton de fermeture en haut à droite (icône X).
const DialogContent = React.forwardRef(({ className, children, overlayClassName, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className,
      )}
      {...props}
    >
      {children}
      {/* <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close> */}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// En-tête de la modale : conteneur pour le titre et la description.
// Layout vertical, centré sur mobile, aligné à gauche sur écran plus large.
const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

// Pied de la modale : conteneur pour les boutons d’action.
// Empile les boutons sur mobile, les aligne à droite sur les écrans plus larges.
const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

// Titre de la modale : balise sémantique <h2> gérée par Radix pour l’accessibilité.
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Description de la modale : texte explicite pour les lecteurs d’écran et l’accessibilité.
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
