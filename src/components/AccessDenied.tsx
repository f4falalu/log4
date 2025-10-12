import { ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function AccessDenied() {
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardContent className="pt-6 text-center">
        <ShieldAlert className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          You don't have permission to view this page. 
          Please contact your administrator if you believe this is an error.
        </p>
      </CardContent>
    </Card>
  );
}
