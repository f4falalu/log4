import { UserTable } from '@/components/admin/users/UserTable';

export default function UsersPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="text-muted-foreground">
          Manage users, assign roles, and control access to the system.
        </p>
      </div>

      <div className="border rounded-lg bg-card">
        <UserTable />
      </div>
    </div>
  );
}
