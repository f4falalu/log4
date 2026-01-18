import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useUserDetail, useUpdateProfile } from '@/hooks/admin/useUserDetail';
import { UserForm } from '@/components/admin/users/UserForm';

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useUserDetail(id!);
  const updateProfile = useUpdateProfile();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading User</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Failed to load user details'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (formData: { full_name: string; phone?: string }) => {
    await updateProfile.mutateAsync({
      userId: id!,
      ...formData,
    });
    navigate(`/admin/users/${id}`);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">{data.profile.full_name}</p>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update user profile details</CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            mode="edit"
            initialData={{
              full_name: data.profile.full_name,
              phone: data.profile.phone || undefined,
            }}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/admin/users/${id}`)}
            isLoading={updateProfile.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
