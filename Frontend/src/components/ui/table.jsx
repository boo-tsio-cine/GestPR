import { cn } from "../lib/utils"
import { forwardRef } from "react"

// Composant Table : wrapper avec défilement horizontal autour d’un <table>.
// Utile pour les tableaux larges sur mobile (overflow-auto).
// Il fusionne les classes par défaut avec className transmise.
const Table = forwardRef(({className, ...props}, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
    ),
);
Table.displayName = "Table";

// Composant TableFooter : pied de tableau stylisé.
// Applique une bordure supérieure, un fond atténué et une graisse moyenne pour marquer le résumé/footer.
const TableFooter = forwardRef(({className, ...props}, ref) =>(
   <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
    ),
);
TableFooter.displayName = "TableFooter";

// Composant TableHeader : en-tête de tableau.
// Applique une bordure inférieure sur les lignes pour séparer l’en-tête du corps.
const TableHeader = forwardRef(({className, ...props}, ref) =>(
     <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props}  />
    ),
);
TableHeader.displayName = "TableHeader";

// Composant TableHead : cellule d’en-tête <th>.
// Hauteur fixe, alignement gauche, texte atténué, et gestion des cases à cocher intégrées.
const TableHead = forwardRef(({className, ...props}, ref) =>(
    <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
    ),
);
TableHead.displayName = "TableHead";

// Composant TableBody : corps du tableau.
// Supprime la bordure de la dernière ligne pour un rendu plus propre.
const TableBody = forwardRef(({className, ...props}, ref) =>(
   <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
    ),
);
TableBody.displayName = "TableBody";

// Composant TableRow : ligne de tableau.
// Bords, transition au survol (fond atténué), et style pour l’état sélectionné.
const TableRow = forwardRef(({className, ...props}, ref) =>(
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
    ),
);
TableRow.displayName = "TableRow";

// Composant TableCell : cellule de données <td>.
// Padding, alignement vertical, et gestion des cases à cocher intégrées.
const TableCell = forwardRef(({className, ...props}, ref) =>(
    <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
    ),
);
TableCell.displayName = "TableCell";

// Composant TableCaption : légende du tableau.
// Placée en haut par défaut (mt-4), texte atténué et petite taille.
const TableCaption = forwardRef(({className, ...props}, ref) =>(
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
    ),
);
TableCaption.displayName = "TableCaption";

export {Table, TableFooter, TableBody, TableCaption, TableCell,TableHeader, TableRow, TableHead}