"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input/Input";

type Props = {
  brandColor: string;
  error?: string;
};

export function PasswordInput({ brandColor, error }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      id="password"
      name="password"
      label="Password"
      type={visible ? "text" : "password"}
      autoComplete="current-password"
      autoFocus
      required
      placeholder="Enter password"
      error={error}
      style={{ "--tw-ring-color": `#${brandColor}` } as React.CSSProperties}
      rightAddon={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="pointer-events-auto text-gray-400 hover:text-gray-600"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
    />
  );
}
