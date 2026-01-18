import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Filter, UserPlus, Loader2, Download } from 'lucide-react';
import { useUsers, User } from '@/hooks/admin/useUsers';
import { AppRole } from '@/types';
import { toCSV, downloadCSV } from '@/lib/csvExport';

const AVAILABLE_ROLES: AppRole[] = [
  'system_admin',
  'warehouse_officer',
  'driver',
  'zonal_manager',
  'viewer',
];

const ROLE_LABELS: Record<AppRole, string> = {
  system_admin: 'System Admin',
  warehouse_officer: 'Warehouse Officer',
  driver: 'Driver',
  zonal_manager: 'Zonal Manager',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<AppRole, string> = {
  system_admin: 'bg-red-500/10 text-red-600 dark:text-red-400',
  warehouse_officer: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  driver: 'bg-green-500/10 text-green-600 dark:text-green-400',
  zonal_manager: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  viewer: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

export function UserTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const { data: users = [], isLoading } = useUsers({ search, roleFilter });

  const exportToCSV = () => {
    const csv = toCSV(
      users.map((u) => ({
        name: u.full_name,
        email: u.email,
        phone: u.phone || '',
        roles: u.roles.join(', '),
        workspace_count: u.workspace_count,
        created_at: new Date(u.created_at).toLocaleDateString(),
      }))
    );
    downloadCSV(csv, `users-${new Date().toISOString()}.csv`);
  };

  const toggleRoleFilter = (role: string) => {
    setRoleFilter((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter by Role
              {roleFilter.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {roleFilter.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {AVAILABLE_ROLES.map((role) => (
              <DropdownMenuCheckboxItem
                key={role}
                checked={roleFilter.includes(role)}
                onCheckedChange={() => toggleRoleFilter(role)}
              >
                {ROLE_LABELS[role]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={exportToCSV} disabled={users.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        <Button onClick={() => navigate('/admin/users/create')}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.user_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/users/${user.user_id}`)}
                >
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.roles.map((role) => (
                        <Badge
                          key={role}
                          className={ROLE_COLORS[role as AppRole]}
                          variant="secondary"
                        >
                          {ROLE_LABELS[role as AppRole]}
                        </Badge>
                      ))}
                      {user.roles.length === 0 && (
                        <span className="text-sm text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{user.workspace_count}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
