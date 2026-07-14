import { useClerk } from "@clerk/tanstack-react-start";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignOutButtonProps = Omit<ComponentProps<typeof Button>, "onClick">;

export function SignOutButton({ className, variant = "ghost", children, ...props }: SignOutButtonProps) {
  const { signOut } = useClerk();
  const navigate = useNavigate();

  return (
    <Button
      variant={variant}
      className={cn("text-destructive hover:text-destructive", className)}
      onClick={() => signOut(() => navigate({ to: "/" }))}
      {...props}
    >
      <LogOut className="mr-1 h-4 w-4" />
      {children ?? "Sign out"}
    </Button>
  );
}
