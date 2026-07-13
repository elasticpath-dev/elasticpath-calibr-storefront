import { forwardRef, type InputHTMLAttributes } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  description?: string;
  error?: string;
  indeterminate?: boolean;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, error, indeterminate, id, disabled, className, ...props }, ref) => {
    const checkId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="flex items-start gap-3">
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkId}
            disabled={disabled}
            aria-invalid={!!error}
            className={cn(
              "peer h-4 w-4 rounded border appearance-none cursor-pointer",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1",
              "checked:bg-brand-primary checked:border-brand-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error ? "border-red-400" : "border-gray-300 hover:border-gray-400",
              className
            )}
            {...props}
          />
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-white opacity-0 peer-checked:opacity-100">
            {indeterminate ? <Minus size={10} strokeWidth={3} /> : <Check size={10} strokeWidth={3} />}
          </span>
        </div>

        {(label || description) && (
          <div className="flex flex-col gap-0.5 min-w-0">
            {label && (
              <label
                htmlFor={checkId}
                className={cn(
                  "text-sm font-medium leading-none cursor-pointer",
                  disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-700"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-gray-500">{description}</p>
            )}
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
