import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { APP_TAGLINE } from "@/constants";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — LumaPath AI" },
      { name: "description", content: "Sign in to LumaPath AI to run guided developmental screenings." },
      { property: "og:title", content: "Sign in — LumaPath AI" },
      { property: "og:description", content: APP_TAGLINE },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

function LoginPage() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, parent, child } = useAppStore();
  const returning = Boolean(parent && child);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: parent?.email ?? "amara.okafor@example.com", password: "lumapath2026" },
  });

  async function onSubmit(values: z.infer<typeof schema>) {
    setPending(true);
    await new Promise((r) => setTimeout(r, 500));
    login(values.email);
    if (returning) {
      toast.success(`Welcome back, ${parent!.fullName.split(" ")[0]}`);
      navigate({ to: "/dashboard" });
      return;
    }
    toast.success("Let's set up your profile");
    navigate({ to: "/onboarding/parent" });
  }

  function google() {
    loginWithGoogle();
    toast.success("Signed in with Google");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-aurora p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-white/10 opacity-70" />
        <Logo compact className="[&>span]:bg-white/20" />
        <div className="relative">
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
            Every child deserves to be understood.
          </h2>
          <p className="mt-5 max-w-md text-white/85">
            LumaPath AI turns a five-minute home video into a structured picture of your child's
            communication — mapped to Communication Matrix levels and ready for your clinician.
          </p>
          <div className="mt-10 flex items-center gap-3 text-sm text-white/80">
            <ShieldCheck className="h-5 w-5" />
            Encrypted storage · HIPAA-aligned workflow · Parent-controlled sharing
          </div>
        </div>
        <p className="relative text-xs text-white/60">
          Screening support tool. Not a diagnostic device.
        </p>
      </div>

      <div className="relative flex items-center justify-center overflow-hidden px-6 py-14">
        <div className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-primary/15" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-accent/15" />
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-sm"
        >
          <Logo className="mb-8 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {returning ? `Welcome back, ${parent!.fullName.split(" ")[0]}` : "Sign in"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {returning
              ? `Sign in to continue ${child!.name}'s developmental journey — no setup needed.`
              : "Continue your child's developmental journey."}
          </p>

          <Card className="mt-7 rounded-3xl border-white/50 bg-card/70 p-6 shadow-lift ring-1 ring-primary/10 backdrop-blur-xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => toast.info("Password reset link sent to your email")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full rounded-xl" disabled={pending}>
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </Form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full rounded-xl" onClick={google}>
              <GoogleIcon />
              Continue with Google
            </Button>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to LumaPath?{" "}
            <Link to="/onboarding/parent" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
    </svg>
  );
}