/**
 * Icon Component
 * Wrapper for Material Symbols icons
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  filled?: boolean;
}

const sizeMap = {
  sm: "text-base", // 16px
  md: "text-xl", // 20px
  lg: "text-2xl", // 24px
  xl: "text-4xl", // 36px
  "2xl": "text-5xl", // 48px
  "3xl": "text-6xl", // 60px
  "4xl": "text-7xl", // 72px
  "5xl": "text-8xl", // 96px
};

const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  ({ className, name, size = "md", filled = false, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "material-symbols-outlined select-none",
          filled && "material-symbols-outlined-filled",
          sizeMap[size],
          className
        )}
        style={{
          fontVariationSettings: filled
            ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24"
            : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        }}
        {...props}
      >
        {name}
      </span>
    );
  }
);

Icon.displayName = "Icon";

export { Icon };
