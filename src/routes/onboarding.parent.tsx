import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";

export const Route = createFileRoute("/onboarding/parent")({
  head: () => ({
    meta: [
      { title: "Create your parent profile — LumaPath AI" },
      { name: "description", content: "Set up your caregiver profile to begin developmental screening." },
      { property: "og:title", content: "Create your parent profile — LumaPath AI" },
      { property: "og:description", content: "Set up your caregiver profile on LumaPath AI." },
    ],
  }),
  component: ParentOnboarding,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(24).optional(),
  relationship: z.enum(["mother", "father", "guardian", "caregiver"]),
  country: z.string().trim().min(2, "Enter your country").max(60),
});

function ParentOnboarding() {
  const navigate = useNavigate();
  const { parent, child, saveParent } = useAppStore();
  const returning = Boolean(parent && child);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: parent?.fullName ?? "",
      email: parent?.email ?? "",
      phone: parent?.phone ?? "",
      relationship: parent?.relationship ?? "mother",
      country: parent?.country ?? "",
    },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    saveParent({ id: parent?.id ?? "p_1", ...values });
    toast.success("Parent profile saved");
    navigate({ to: "/onboarding/child" });
  }

  return (
    <OnboardingLayout step={1} title="Create your parent profile" subtitle="This keeps reports correctly attributed and lets clinicians reach you.">
      {returning && (
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Your profile for {child!.name} is already set up — nothing to fill in again.
          </p>
          <Button
            type="button"
            className="shrink-0 rounded-xl"
            onClick={() => navigate({ to: "/dashboard" })}
          >
            Go to dashboard
          </Button>
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Amara Okafor" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 415 555 0142" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship to child</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="guardian">Legal guardian</SelectItem>
                      <SelectItem value="caregiver">Caregiver</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="United States" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" className="w-full rounded-xl">
            Continue
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}
