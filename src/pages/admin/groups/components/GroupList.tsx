import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Key } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type GroupWithDetails } from '@/hooks/rbac';

interface GroupListProps {
  groups: GroupWithDetails[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}

export function GroupList({ groups, selectedGroupId, onSelectGroup }: GroupListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Groups</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1 px-2 pb-2">
          {groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">No groups yet</p>
            </div>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className={cn(
                  'w-full text-left px-3 py-3 rounded-md hover:bg-accent transition-colors',
                  selectedGroupId === group.id && 'bg-accent'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{group.name}</p>
                    {group.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Users className="h-3 w-3" />
                    {group.member_count}
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Key className="h-3 w-3" />
                    {group.permission_count}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
