import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  ROLE_LABELS,
  ROLE_COLORS,
  type WorkspaceMemberV2,
} from '@/hooks/settings/useWorkspaceMembers';

interface MemberSelectorProps {
  members: WorkspaceMemberV2[];
  selectedUserId: string | null;
  onSelect: (member: WorkspaceMemberV2) => void;
}

export function MemberSelector({ members, selectedUserId, onSelect }: MemberSelectorProps) {
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="border rounded-lg">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Members</h3>
        <p className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? 's' : ''}</p>
      </div>
      <ScrollArea className="h-[500px]">
        <div className="p-2 space-y-1">
          {members.map((member) => (
            <div
              key={member.user_id}
              onClick={() => onSelect(member)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                'hover:bg-accent',
                selectedUserId === member.user_id && 'bg-accent border border-primary/20'
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10">
                  {getInitials(member.profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.profile.full_name}</p>
                <Badge
                  className={cn('text-[10px] px-1.5 py-0', ROLE_COLORS[member.role_code] || ROLE_COLORS.viewer)}
                  variant="secondary"
                >
                  {ROLE_LABELS[member.role_code] || member.role_code}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
