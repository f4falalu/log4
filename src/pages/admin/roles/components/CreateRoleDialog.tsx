import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCreateRole } from '@/hooks/rbac';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50),
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Code must be lowercase alphanumeric with underscores only'),
  description: z.string().max(200).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (roleId: string) => void;
}

export function CreateRoleDialog({ open, onOpenChange, onSuccess }: CreateRoleDialogProps) {
  const { toast } = useToast();
  const createRole = useCreateRole();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const role = await createRole.mutateAsync({
        name: data.name,
        code: data.code,
        description: data.description || undefined,
      });

      toast({
        title: 'Role created',
        description: `${role.name} has been created successfully`,
      });

      form.reset();
      onSuccess(role.id);
    } catch (error) {
      toast({
        title: 'Error creating role',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const generateCode = () => {
    const name = form.getValues('name');
    if (name) {
      const code = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');
      form.setValue('code', code);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Create a new role and assign permissions to it.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Fleet Manager"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        if (!form.getValues('code')) {
                          generateCode();
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>A human-readable name for the role</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Code</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="e.g., fleet_manager"
                        {...field}
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCode}
                      disabled={!form.getValues('name')}
                    >
                      Generate
                    </Button>
                  </div>
                  <FormDescription>
                    Unique identifier (lowercase, underscores only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this role is for..."
                      {...field}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={createRole.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createRole.isPending}>
                {createRole.isPending ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
