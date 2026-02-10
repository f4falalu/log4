import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceArea } from '@/types/service-areas';
import { ServiceAreaStats } from './service-areas/ServiceAreaStats';
import { ServiceAreaTable } from './service-areas/ServiceAreaTable';
import { CreateServiceAreaWizard } from './service-areas/CreateServiceAreaWizard';
import { ServiceAreaDetailDialog } from './service-areas/ServiceAreaDetailDialog';
import { EditServiceAreaDialog } from './service-areas/EditServiceAreaDialog';

export function ServiceAreaTabContent() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailServiceArea, setDetailServiceArea] = useState<ServiceArea | null>(null);
  const [editServiceArea, setEditServiceArea] = useState<ServiceArea | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Service Areas</h2>
          <p className="text-muted-foreground mt-1">
            Define facility-to-warehouse access logic within zones
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Service Area
        </Button>
      </div>

      {/* Stats */}
      <ServiceAreaStats />

      {/* Table */}
      <ServiceAreaTable
        onViewDetail={setDetailServiceArea}
        onEdit={setEditServiceArea}
      />

      {/* Dialogs */}
      <CreateServiceAreaWizard
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {detailServiceArea && (
        <ServiceAreaDetailDialog
          serviceArea={detailServiceArea}
          open={!!detailServiceArea}
          onOpenChange={(open) => !open && setDetailServiceArea(null)}
          onEdit={(sa) => {
            setDetailServiceArea(null);
            setEditServiceArea(sa);
          }}
        />
      )}

      {editServiceArea && (
        <EditServiceAreaDialog
          serviceArea={editServiceArea}
          open={!!editServiceArea}
          onOpenChange={(open) => !open && setEditServiceArea(null)}
        />
      )}
    </div>
  );
}
