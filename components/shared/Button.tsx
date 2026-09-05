"use client";

import { ButtonHTMLAttributes } from "react";
import { LucideIcon } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "amber";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: LucideIcon;
}

const styles: Record<Variant, string> = {
  primary: "bg-teal-700 text-white hover:bg-teal-800",
  secondary: "bg-white text-teal-800 border border-teal-200 hover:bg-teal-50",
  ghost: "bg-transparent text-stone-600 hover:bg-stone-100",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  amber: "bg-amber-500 text-white hover:bg-amber-600",
};

export default function Button({ variant = "primary", icon: Icon, className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors px-5 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {Icon && <Icon size={17} />}
      {children}
    </button>
  );
}
