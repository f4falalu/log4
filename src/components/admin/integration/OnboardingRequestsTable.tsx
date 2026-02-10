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
import { Loader2, AlertCircle, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import {
  useOnboardingRequests,
  useApproveRequest,
  useRejectRequest,
  type OnboardingRequest,
} from '@/hooks/admin/useOnboardingRequests';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-green-500/10 text-green-600',
  rejected: 'bg-red-500/10 text-red-600',
};

interface OnboardingRequestsTableProps {
  onApproveWithOTP?: (email: string) => void;
}

export function OnboardingRequestsTable({ onApproveWithOTP }: OnboardingRequestsTableProps) {
  const { data: requests = [], isLoading, error } = useOnboardingRequests();
  const approveRequest = useApproveRequest();
  const rejectRequest = useRejectRequest();

  if (error) {
    return (
      <div className="text-center py-12 p-4">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="font-medium mb-1">Failed to load requests</p>
        <p className="text-sm text-muted-foreground">
          {(error as { message?: string })?.message || 'Could not fetch onboarding requests.'}
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

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No onboarding requests yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Drivers can submit access requests from the MOD4 app.
        </p>
      </div>
    );
  }

  const handleApprove = async (request: OnboardingRequest) => {
    await approveRequest.mutateAsync({ requestId: request.id });
    // If email is provided, trigger the OTP generation dialog
    if (request.email && onApproveWithOTP) {
      onApproveWithOTP(request.email);
    }
  };

  return (
    <div className="p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req: OnboardingRequest) => (
            <TableRow key={req.id}>
              <TableCell>
                <p className="font-medium">{req.full_name}</p>
              </TableCell>
              <TableCell>
                <div>
                  {req.phone && (
                    <p className="text-sm">{req.phone}</p>
                  )}
                  {req.email && (
                    <p className="text-sm text-muted-foreground">{req.email}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {req.organization_hint || '-'}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {new Date(req.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge className={STATUS_COLORS[req.status]} variant="secondary">
                  {req.status}
                </Badge>
              </TableCell>
              <TableCell>
                {req.status === 'pending' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleApprove(req)}
                        disabled={approveRequest.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => rejectRequest.mutate({ requestId: req.id })}
                        disabled={rejectRequest.isPending}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
