
// Composant Toaster : wrapper autour de Sonner pour afficher des notifications (toasts).
// Sonner est une librairie de toasts accessible et animée.
// Ce composant configure le style visuel global des toasts via totalOptions,
// puis transmet toutes les props reçues à Sonner pour un usage standard (toast.success, toast.error, etc.).
// Il n’est pas nécessaire de l’utiliser directement : placez-le une fois dans le layout de l’application.

type ToasterProps = React.ComponentProps<typeof Sonner>
const Toaster = ({
    ...props
} : ToasterProps) => {
    return(
        <Sonner
            className="toaster group" // Classe racine pour cibler le conteneur de toasts en CSS.
            totalOptions={{
                // Configuration globale du style de chaque toast via classNames.
                classNames: {
                    // Style du conteneur principal du toast.
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
                    // Style de la description (texte secondaire du toast).
                    description: "group-[.toast]:text-muted-foreground",
                    // Style du bouton d’action dans un toast (ex: "Annuler", "Réessayer").
                    actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    // Style du bouton d’annulation dans un toast.
                    cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                },
            }}
            {
                ...props // Transmet les props Sonner supplémentaires (position, durée, richColors, etc.).
            }
        />
    )
}


export {
    Toaster
};      