"use client";

import { useState, type ReactNode } from "react";
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertVariant = "info" | "success" | "warning" | "error";

export type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
};

const variantConfig: Record<
  AlertVariant,
  { icon: ReactNode; styles: string; iconColor: string }
> = {
  info: {
    icon: <Info size={16} />,
    styles: "bg-blue-50 border-blue-200 text-blue-800",
    iconColor: "text-blue-500",
  },
  success: {
    icon: <CheckCircle2 size={16} />,
    styles: "bg-green-50 border-green-200 text-green-800",
    iconColor: "text-green-500",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    styles: "bg-amber-50 border-amber-200 text-amber-800",
    iconColor: "text-amber-500",
  },
  error: {
    icon: <XCircle size={16} />,
    styles: "bg-red-50 border-red-200 text-red-800",
    iconColor: "text-red-500",
  },
};

export function Alert({
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  className,
}: AlertProps) {
  const [visible, setVisible] = useState(true);
  const config = variantConfig[variant];

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3",
        config.styles,
        className
      )}
    >
      <span className={cn("shrink-0 mt-0.5", config.iconColor)}>
        {config.icon}
      </span>

      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold mb-0.5">{title}</p>}
        {children && <div className="text-sm opacity-90">{children}</div>}
      </div>

      {dismissible && (
        <button
          onClick={handleDismiss}
          aria-label="Dismiss alert"
          className="shrink-0 self-start p-0.5 rounded hover:opacity-70 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
