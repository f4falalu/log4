import { useState } from 'react';
import { Plus, Search, X, MapPin, Building2, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLGAs, useLGAStats, useDeleteLGA, LGAFilters } from '@/hooks/useLGAs';
import { LGA } from '@/types/zones';
import { useOperationalZones } from '@/hooks/useOperationalZones';
import { LGAFormDialog } from './components/LGAFormDialog';
import { LGADetailDialog } from './components/LGADetailDialog';
import { LGAsTable } from './components/LGAsTable';

export default function LGAsPage() {
  const [filters, setFilters] = useState<LGAFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLGA, setEditingLGA] = useState<LGA | undefined>();
  const [selectedLGA, setSelectedLGA] = useState<LGA | null>(null);

  const { data: lgas, isLoading: lgasLoading } = useLGAs({ ...filters, search: searchTerm });
  const { data: stats, isLoading: statsLoading } = useLGAStats();
  const { data: zones } = useOperationalZones();
  const deleteLGA = useDeleteLGA();

  const isLoading = lgasLoading || statsLoading;

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const handleEdit = (lga: LGA) => {
    setEditingLGA(lga);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this LGA? This may affect associated facilities.')) {
      await deleteLGA.mutateAsync(id);
    }
  };

  const handleRowClick = (lga: LGA) => {
    setSelectedLGA(lga);
  };

  const activeFiltersCount =
    Object.values(filters).filter((v) => v !== undefined).length + (searchTerm ? 1 : 0);

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold">LGA Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage Local Government Areas and their assignments
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingLGA(undefined);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add LGA
        </Button>
      </div>

      {/* Stats Cards */}
      {!isLoading && stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total LGAs</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLGAs}</div>
              <p className="text-xs text-muted-foreground">
                {stats.assignedToZone} assigned to zones
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned LGAs</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unassignedToZone}</div>
              <p className="text-xs text-muted-foreground">Need zone assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Population</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalPopulation.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Across all LGAs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Facilities/LGA</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalLGAs > 0
                  ? Math.round(
                      Object.values(stats.facilitiesByLGA).reduce((a, b) => a + b, 0) /
                        stats.totalLGAs
                    )
                  : 0}
              </div>
              <p className="text-xs text-muted-foreground">Per LGA</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search LGAs by name..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select
          value={filters.zone_id || ''}
          onValueChange={(value) => handleFilterChange('zone_id', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Zones</SelectItem>
            {zones?.map((zone) => (
              <SelectItem key={zone.id} value={zone.id}>
                {zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.state || ''}
          onValueChange={(value) => handleFilterChange('state', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All States</SelectItem>
            <SelectItem value="kano">Kano</SelectItem>
          </SelectContent>
        </Select>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active Filters Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchTerm}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleSearch('')} />
            </Badge>
          )}
          {Object.entries(filters).map(([key, value]) =>
            value ? (
              <Badge key={key} variant="secondary" className="gap-1">
                {key}: {value}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange(key, undefined)}
                />
              </Badge>
            ) : null
          )}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !lgas || lgas.length === 0 ? (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No LGAs found</h3>
          <p className="text-muted-foreground text-center mb-4">
            {activeFiltersCount > 0
              ? 'No LGAs match your filters'
              : 'Add your first LGA to get started'}
          </p>
          {activeFiltersCount === 0 && (
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add LGA
            </Button>
          )}
        </div>
      ) : (
        <LGAsTable
          lgas={lgas}
          onRowClick={handleRowClick}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Dialogs */}
      <LGAFormDialog
        lga={editingLGA}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      {selectedLGA && (
        <LGADetailDialog
          lga={selectedLGA}
          open={!!selectedLGA}
          onOpenChange={(open) => !open && setSelectedLGA(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
