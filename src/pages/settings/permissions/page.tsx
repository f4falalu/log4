import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionInspector } from '@/components/settings/PermissionInspector';

export default function PermissionsPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <PermissionInspector />
      </div>
    </ProtectedRoute>
  );
}
