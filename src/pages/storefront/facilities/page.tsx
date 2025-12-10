import { useState } from 'react';
import { Plus, Download, Upload, Search, Filter, X, Map, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useFacilities, useDeleteFacility, useBulkDeleteFacilities } from '@/hooks/useFacilities';
import { FacilityFilters } from '@/lib/facility-validation';
import { Facility } from '@/types';
import { FacilitiesTable } from './components/FacilitiesTable';
import { FacilityDetailDialog } from './components/FacilityDetailDialog';
import { FacilityFormDialog } from './components/FacilityFormDialog';
import { EnhancedCSVImportDialog } from './components/EnhancedCSVImportDialog';
import { FacilitiesMapView } from './components/FacilitiesMapView';
import { Skeleton } from '@/components/ui/skeleton';
import { exportFacilitiesToCSV, generateExportFilename, downloadCSVTemplate } from '@/lib/csv-export';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFacilitiesRealtime } from '@/hooks/useFacilitiesRealtime';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function StorefrontFacilities() {
  // Enable realtime updates
  useFacilitiesRealtime();
  // State for filters
  const [filters, setFilters] = useState<FacilityFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(50);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');

  // State for dialogs
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCSVImportOpen, setIsCSVImportOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | undefined>();

  // State for column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    warehouse_code: true,
    name: true,
    lga: true,
    ward: true,
    level_of_care: true,
    programme: true,
    coordinates: true,
  });

  // State for bulk actions
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Query hooks
  const { data, isLoading, error } = useFacilities(
    { ...filters, search: searchTerm },
    page,
    pageSize
  );
  const deleteFacility = useDeleteFacility();
  const bulkDelete = useBulkDeleteFacilities();

  const facilities = data?.facilities || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0); // Reset to first page on search
  };

  const handleFilterChange = (key: keyof FacilityFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(0);
  };

  const handleRowClick = (facility: Facility) => {
    setSelectedFacility(facility);
    setIsDetailOpen(true);
  };

  const handleEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this facility?')) {
      await deleteFacility.mutateAsync(id);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Delete ${selectedRows.size} facilities?`)) {
      await bulkDelete.mutateAsync(Array.from(selectedRows));
      setSelectedRows(new Set());
    }
  };

  const handleRowSelect = (id: string, selected: boolean) => {
    const newSet = new Set(selectedRows);
    if (selected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedRows(newSet);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(facilities.map(f => f.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined).length +
    (searchTerm ? 1 : 0);

  const handleExportSelected = () => {
    const selectedFacilities = facilities.filter((f) => selectedRows.has(f.id));
    if (selectedFacilities.length === 0) {
      toast.error('No facilities selected for export');
      return;
    }
    try {
      exportFacilitiesToCSV(selectedFacilities, visibleColumns, generateExportFilename());
      toast.success(`Exported ${selectedFacilities.length} facilities`);
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  const handleExportAll = () => {
    if (facilities.length === 0) {
      toast.error('No facilities to export');
      return;
    }
    try {
      exportFacilitiesToCSV(facilities, visibleColumns, generateExportFilename());
      toast.success(`Exported ${facilities.length} facilities`);
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadCSVTemplate();
      toast.success('Template downloaded successfully');
    } catch (error: any) {
      toast.error(`Failed to download template: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold">Facilities Management</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {total} total facilities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleExportAll}>
                Export All ({total})
              </DropdownMenuItem>
              {selectedRows.size > 0 && (
                <DropdownMenuItem onClick={handleExportSelected}>
                  Export Selected ({selectedRows.size})
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDownloadTemplate}>
                Download Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCSVImportOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingFacility(undefined);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Facility
          </Button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* View Mode Toggle */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'map')}>
          <TabsList>
            <TabsTrigger value="table" className="gap-2">
              <List className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-4 w-4" />
              Map
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, LGA, ward..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <Select
          value={filters.state || ''}
          onValueChange={(value) => handleFilterChange('state', value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="kano">Kano</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.level_of_care || ''}
          onValueChange={(value) => handleFilterChange('level_of_care', value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Level of Care" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Primary">Primary</SelectItem>
            <SelectItem value="Secondary">Secondary</SelectItem>
            <SelectItem value="Tertiary">Tertiary</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.service_zone || ''}
          onValueChange={(value) => handleFilterChange('service_zone', value)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Service Zone" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Central">Central</SelectItem>
            <SelectItem value="Gaya">Gaya</SelectItem>
            <SelectItem value="Danbatta">Danbatta</SelectItem>
            <SelectItem value="Gwarzo">Gwarzo</SelectItem>
            <SelectItem value="Rano">Rano</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.programme || ''}
          onValueChange={(value) => handleFilterChange('programme', value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Programme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Family Planning">Family Planning</SelectItem>
            <SelectItem value="DRF">DRF</SelectItem>
            <SelectItem value="HIV/AIDS">HIV/AIDS</SelectItem>
            <SelectItem value="Malaria">Malaria</SelectItem>
          </SelectContent>
        </Select>

        {/* Column Visibility */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries({
              warehouse_code: 'Warehouse Code',
              name: 'Name',
              lga: 'LGA',
              ward: 'Ward',
              level_of_care: 'Level of Care',
              programme: 'Programme',
              funding_source: 'Funding Source',
              service_zone: 'Service Zone',
              coordinates: 'Coordinates',
            }).map(([key, label]) => (
              <DropdownMenuCheckboxItem
                key={key}
                checked={visibleColumns[key]}
                onCheckedChange={(checked) =>
                  setVisibleColumns(prev => ({ ...prev, [key]: checked }))
                }
              >
                {label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
          >
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
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleSearch('')}
              />
            </Badge>
          )}
          {Object.entries(filters).map(([key, value]) =>
            value ? (
              <Badge key={key} variant="secondary" className="gap-1">
                {key}: {value}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleFilterChange(key as keyof FacilityFilters, undefined)}
                />
              </Badge>
            ) : null
          )}
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedRows.size} {selectedRows.size === 1 ? 'facility' : 'facilities'} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRows(new Set())}
            >
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={bulkDelete.isPending}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Table/Map View */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Error loading facilities: {error.message}</p>
        </div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {activeFiltersCount > 0
              ? 'No facilities match your filters'
              : 'No facilities yet. Add your first facility to get started.'}
          </p>
        </div>
      ) : viewMode === 'map' ? (
        <div className="h-[calc(100vh-400px)] min-h-[500px]">
          <FacilitiesMapView
            facilities={facilities}
            onFacilityClick={handleRowClick}
            selectedFacility={selectedFacility}
          />
        </div>
      ) : (
        <>
          <FacilitiesTable
            facilities={facilities}
            visibleColumns={visibleColumns}
            selectedRows={selectedRows}
            onRowClick={handleRowClick}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {/* Pagination */}
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={total}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </>
      )}

      {/* Dialogs */}
      {selectedFacility && (
        <FacilityDetailDialog
          facility={selectedFacility}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <FacilityFormDialog
        facility={editingFacility}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      <EnhancedCSVImportDialog
        open={isCSVImportOpen}
        onOpenChange={setIsCSVImportOpen}
      />
    </div>
  );
}
