import * as React from "react";

// Simple class name merger - works without external dependencies
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual style */
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost" | "destructive" | "success";
  /** Button size ("touch" = 48px, for POS/tablet) */
  size?: "sm" | "md" | "lg" | "touch";
  /** Loading state with spinner */
  isLoading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      isLoading = false,
      fullWidth = false,
      disabled = false,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    // Base styles (token-driven; teal focus ring)
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    // Variant styles — semantic tokens only
    const variantStyles = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      primary: "bg-primary text-primary-foreground hover:bg-primary/90",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      outline: "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
      ghost: "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground",
      destructive: "bg-destructive text-white hover:bg-destructive/90",
      success: "bg-success text-success-foreground hover:bg-success/90",
    };

    // Size styles (heights give adequate touch targets; "touch" = 48px for POS)
    // Heights per DESIGN_SYSTEM.md "Density & sizing — v2": 32/36/40 for desk,
    // 48 (touch) reserved for POS register + kiosk.
    const sizeStyles = {
      sm: "h-8 px-3 text-sm",
      md: "h-9 px-4 text-sm",
      lg: "h-10 px-5 text-sm",
      touch: "h-12 px-6 text-base",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";