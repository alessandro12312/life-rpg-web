import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmText = "Conferma",
  cancelText = "Annulla",
  isDestructive = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface border border-surface-border p-6 shadow-2xl z-[101]"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl drop-shadow-sm ${isDestructive ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex flex-col gap-1.5 mt-1">
                  <h2 className="text-lg font-bold leading-none tracking-tight text-foreground">
                    {title}
                  </h2>
                  <p className="text-sm text-foreground/60 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
              <div className="flex w-full justify-end gap-2 mt-4 pt-4 border-t border-surface-border">
                <Button variant="ghost" onClick={onCancel} className="text-foreground/60 hover:text-foreground">
                  {cancelText}
                </Button>
                <Button 
                    variant={isDestructive ? "destructive" : "default"}
                    onClick={onConfirm}
                >
                  {confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
