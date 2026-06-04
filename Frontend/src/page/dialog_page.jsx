import { useEffect, useRef } from "react";
import { Button } from "../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import "./format.css";

function DialogPage({
    isOpen,
    onClose,
    title,
    description,
    children,
    footer,
    className = "",
    style,
    showCloseButton = true,
    mainSelector = "main",
}){
    const prevMainBlur = useRef("");

    useEffect(() => {
        const main = document.querySelector(mainSelector);
        if (!main) return;

        if (isOpen) {
            prevMainBlur.current = main.className;
            main.className = `${main.className} transition blur-sm`.trim();
        } else if (prevMainBlur.current) {
            main.className = prevMainBlur.current;
            prevMainBlur.current = "";
        }
    }, [isOpen, mainSelector]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      className="dialog"
    >
      <DialogContent
        className={`
          sm:max-w-[500px]
          rounded-2xl
          shadow-2xl
          p-6
          ${className}
          format
        `}
        style={style}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>

          {description && (
            <DialogDescription className="text-gray-500">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-4">
          {children}
        </div>

        {(footer || showCloseButton) && (
          <DialogFooter>
            {showCloseButton && (
              <DialogClose asChild>
                {/* <Button
                  variant="outline"
                  onClick={onClose}
                >
                  Annuler
                </Button> */}
              </DialogClose>
            )}

            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DialogPage;