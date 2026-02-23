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
import { useCreatePermissionSet } from '@/hooks/rbac';

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

interface CreatePermissionSetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (setId: string) => void;
}

export function CreatePermissionSetDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreatePermissionSetDialogProps) {
  const { toast } = useToast();
  const createPermissionSet = useCreatePermissionSet();

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
      const set = await createPermissionSet.mutateAsync({
        name: data.name,
        code: data.code,
        description: data.description || undefined,
      });

      toast({
        title: 'Permission set created',
        description: `${set.name} has been created successfully`,
      });

      form.reset();
      onSuccess(set.id);
    } catch (error) {
      toast({
        title: 'Error creating permission set',
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
          <DialogTitle>Create Permission Set</DialogTitle>
          <DialogDescription>
            Create a new permission set to grant additional privileges to users.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Set Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Emergency Dispatch Override"
                      {...field}
                      onBlur={(e) => {
                        field.onBlur();
                        if (!form.getValues('code')) {
                          generateCode();
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>A human-readable name for the permission set</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permission Set Code</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="e.g., emergency_dispatch"
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
                      placeholder="Describe when and why this permission set should be used..."
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
                disabled={createPermissionSet.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPermissionSet.isPending}>
                {createPermissionSet.isPending ? 'Creating...' : 'Create Permission Set'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
