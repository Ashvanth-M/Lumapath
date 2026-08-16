import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { OnboardingLayout } from "@/components/layout/OnboardingLayout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";
import { DEMO_CHILD } from "@/services/mockData";
import { ageBandForBirthDate } from "@/utils/age";

export const Route = createFileRoute("/onboarding/child")({
  head: () => ({
    meta: [
      { title: "Add your child — LumaPath AI" },
      { name: "description", content: "Add your child's profile so screenings are matched to their age band." },
      { property: "og:title", content: "Add your child — LumaPath AI" },
      { property: "og:description", content: "Add your child's profile on LumaPath AI." },
    ],
  }),
  component: ChildOnboarding,
});

const schema = z.object({
  name: z.string().trim().min(2, "Enter your child's name").max(60),
  birthDate: z.string().min(1, "Select a date of birth"),
  gender: z.enum(["male", "female", "other"]),
  medicalNotes: z.string().trim().max(1000).optional(),
});

function ChildOnboarding() {
  const navigate = useNavigate();
  const { child, saveChild } = useAppStore();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: child?.name ?? "",
      birthDate: child?.birthDate ?? "",
      gender: child?.gender ?? "female",
      medicalNotes: child?.medicalNotes ?? "",
    },
  });

  function onSubmit(values: z.infer<typeof schema>) {
    saveChild({
      id: child?.id ?? "c_1",
      ...values,
      ageBandId: ageBandForBirthDate(values.birthDate),
      developmentHistory: child?.developmentHistory ?? DEMO_CHILD.developmentHistory,
      communicationHistory: child?.communicationHistory ?? DEMO_CHILD.communicationHistory,
    });
    toast.success("Child profile created");
    navigate({ to: "/dashboard" });
  }

  return (
    <OnboardingLayout
      step={2}
      title="Add your child"
      subtitle="We use the date of birth to select the right activity set and developmental norms."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Child's name</FormLabel>
                <FormControl>
                  <Input placeholder="Zuri Okafor" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth</FormLabel>
                  <FormControl>
                    <Input type="date" max={new Date().toISOString().slice(0, 10)} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="medicalNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Medical notes</FormLabel>
                <FormControl>
                  <Textarea
                    rows={4}
                    placeholder="Birth history, hearing screening results, ear infections, therapies…"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Shared only with clinicians you choose. Helps the AI weigh hearing-related risk factors.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full rounded-xl">
            Go to dashboard
          </Button>
        </form>
      </Form>
    </OnboardingLayout>
  );
}