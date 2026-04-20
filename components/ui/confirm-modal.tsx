"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { X, AlertTriangle, Trash2, Info, HelpCircle } from "lucide-react";

export type ConfirmModalVariant = "danger" | "warning" | "info" | "default";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmModalVariant;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<
  ConfirmModalVariant,
  {
    iconBg: string;
    iconColor: string;
    confirmVariant: "destructive" | "default" | "secondary";
    defaultIcon: React.ReactNode;
  }
> = {
  danger: {
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    confirmVariant: "destructive",
    defaultIcon: <Trash2 className="h-6 w-6" />,
  },
  warning: {
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-500",
    confirmVariant: "default",
    defaultIcon: <AlertTriangle className="h-6 w-6" />,
  },
  info: {
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-500",
    confirmVariant: "default",
    defaultIcon: <Info className="h-6 w-6" />,
  },
  default: {
    iconBg: "bg-secondary",
    iconColor: "text-muted-foreground",
    confirmVariant: "default",
    defaultIcon: <HelpCircle className="h-6 w-6" />,
  },
};

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Потвърди",
  cancelText = "Отказ",
  variant = "default",
  loading = false,
  icon,
}: ConfirmModalProps) {
  const styles = variantStyles[variant];

  // Close on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    },
    [onClose, loading]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Затвори"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full mb-4",
              styles.iconBg,
              styles.iconColor
            )}
          >
            {icon || styles.defaultIcon}
          </div>

          {/* Title */}
          <h2
            id="modal-title"
            className="text-lg font-semibold mb-2"
          >
            {title}
          </h2>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              {description}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {cancelText}
            </Button>
            <Button
              variant={styles.confirmVariant}
              onClick={onConfirm}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Зареждане...
                </span>
              ) : (
                confirmText
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
