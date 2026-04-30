"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { FormFieldWrapper } from "@/components/ui/form-field-wrapper";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useUpdateUserMutation } from "@/hooks/use-user-mutations";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/lib/query/query-keys";

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long"),
  image: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional(),
  bio: z
    .string()
    .trim()
    .max(500, "Bio must be 500 characters or less")
    .optional(),
  github: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional(),
  twitter: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional(),
  website: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .or(z.literal(""))
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type SessionCache = { user?: Partial<ProfileFormValues> } & Record<
  string,
  unknown
>;

interface ProfileTabProps {
  defaultValues: ProfileFormValues;
}

export function ProfileTab({ defaultValues }: ProfileTabProps) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending } = useUpdateUserMutation();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const handleSubmit = async (values: ProfileFormValues) => {
    const dirtyFields = form.formState.dirtyFields;
    const changedValues = Object.fromEntries(
      Object.entries(values).filter(
        ([key]) => dirtyFields[key as keyof ProfileFormValues],
      ),
    ) as Partial<ProfileFormValues>;

    if (Object.keys(changedValues).length === 0) return;

    const previous = queryClient.getQueryData<SessionCache>(authKeys.session());

    queryClient.setQueryData<SessionCache>(authKeys.session(), (old) => {
      if (!old || typeof old !== "object") return old;
      return { ...old, user: { ...old.user, ...changedValues } };
    });

    try {
      await mutateAsync(changedValues);
      form.reset(values);
    } catch {
      queryClient.setQueryData(authKeys.session(), previous);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="space-y-4">
          <FormFieldWrapper
            control={form.control}
            name="name"
            label="Display Name"
            render={({ field }) => <Input placeholder="Your name" {...field} />}
          />

          <FormFieldWrapper
            control={form.control}
            name="image"
            label="Avatar URL"
            render={({ field }) => (
              <Input
                placeholder="https://example.com/avatar.png"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />

          <FormFieldWrapper
            control={form.control}
            name="bio"
            label="Bio"
            render={({ field }) => (
              <Textarea
                placeholder="Tell us a bit about yourself"
                className="resize-none"
                rows={4}
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Social Links</h3>

          <FormFieldWrapper
            control={form.control}
            name="github"
            label="GitHub"
            render={({ field }) => (
              <Input
                placeholder="https://github.com/username"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />

          <FormFieldWrapper
            control={form.control}
            name="twitter"
            label="Twitter / X"
            render={({ field }) => (
              <Input
                placeholder="https://twitter.com/username"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />

          <FormFieldWrapper
            control={form.control}
            name="website"
            label="Personal Website"
            render={({ field }) => (
              <Input
                placeholder="https://yoursite.com"
                {...field}
                value={field.value ?? ""}
              />
            )}
          />
        </div>

        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </form>
    </Form>
  );
}
