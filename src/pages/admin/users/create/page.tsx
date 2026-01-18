import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { UserForm } from '@/components/admin/users/UserForm';
import { toast } from 'sonner';

export default function UserCreatePage() {
  const navigate = useNavigate();

  const handleSubmit = async (formData: { full_name: string; phone?: string }) => {
    // NOTE: User creation requires Supabase Admin API or auth.admin.createUser
    // This is a placeholder - actual implementation needs backend RPC function
    toast.error('User creation not yet implemented. Requires admin API integration.');
    console.log('Create user:', formData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
          <p className="text-muted-foreground">Add a new user to the system</p>
        </div>
      </div>

      {/* Create Form */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Enter details for the new user</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/admin/users')}
            isLoading={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
