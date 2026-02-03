import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, AlertCircle, MoreHorizontal, Ban, Trash2 } from 'lucide-react';
import {
  useLinkedUsers,
  useSuspendLink,
  useRevokeLink,
  type Mod4DriverLink,
} from '@/hooks/admin/useIntegration';

const METHOD_LABELS: Record<string, string> = {
  email_invitation: 'Email',
  otp: 'OTP',
  admin_direct: 'Direct',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600',
  suspended: 'bg-amber-500/10 text-amber-600',
  revoked: 'bg-red-500/10 text-red-600',
};

export function LinkedUsersTable() {
  const { data: links = [], isLoading, error } = useLinkedUsers();
  const suspendLink = useSuspendLink();
  const revokeLink = useRevokeLink();

  if (error) {
    return (
      <div className="text-center py-12 p-4">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="font-medium mb-1">Failed to load linked users</p>
        <p className="text-sm text-muted-foreground">
          {(error as { message?: string })?.message || 'Could not fetch integration data.'}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No users linked to Mod4 yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Use the buttons above to link users via email or OTP.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Linked At</TableHead>
            <TableHead>Linked By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link: Mod4DriverLink) => (
            <TableRow key={link.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{link.user_name || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{link.user_email}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {METHOD_LABELS[link.link_method] || link.link_method}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {new Date(link.linked_at).toLocaleDateString()}
              </TableCell>
              <TableCell>{link.linked_by_name || '-'}</TableCell>
              <TableCell>
                <Badge className={STATUS_COLORS[link.status]} variant="secondary">
                  {link.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {link.status === 'active' && (
                      <DropdownMenuItem
                        onClick={() => suspendLink.mutate(link.id)}
                        disabled={suspendLink.isPending}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Suspend
                      </DropdownMenuItem>
                    )}
                    {link.status !== 'revoked' && (
                      <DropdownMenuItem
                        onClick={() => revokeLink.mutate(link.id)}
                        disabled={revokeLink.isPending}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Revoke
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
