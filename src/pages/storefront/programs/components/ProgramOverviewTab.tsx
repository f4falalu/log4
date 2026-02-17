import { useState } from 'react';
import { Plus, Search, Filter, X } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { usePrograms } from '@/hooks/usePrograms';
import { ProgramCard } from './ProgramCard';
import { ProgramFormDialog } from './ProgramFormDialog';
import { ProgramDetailDialog } from './ProgramDetailDialog';
import type { Program } from '@/types/program';

export function ProgramOverviewTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fundingSourceFilter, setFundingSourceFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | undefined>();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data, isLoading, error } = usePrograms({
    search: searchTerm,
    status: statusFilter || undefined,
    funding_source: fundingSourceFilter || undefined,
  });

  const programs = data?.programs || [];

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setIsFormOpen(true);
  };

  const handleViewDetails = (program: Program) => {
    setSelectedProgram(program);
    setIsDetailOpen(true);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setFundingSourceFilter('');
  };

  const activeFiltersCount = [searchTerm, statusFilter, fundingSourceFilter].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          {/* Funding Source Filter */}
          <Select value={fundingSourceFilter || undefined} onValueChange={(value) => setFundingSourceFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Funding Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Funding Sources</SelectItem>
              <SelectItem value="usaid-pmm">USAID PMM</SelectItem>
              <SelectItem value="usaid-art">USAID ART</SelectItem>
              <SelectItem value="global-fund">Global Fund</SelectItem>
              <SelectItem value="usaid-nhdp">USAID NHDP</SelectItem>
              <SelectItem value="who">WHO</SelectItem>
              <SelectItem value="unfpa">UNFPA</SelectItem>
            </SelectContent>
          </Select>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-2" />
              Clear ({activeFiltersCount})
            </Button>
          )}
        </div>

        {/* Add Program Button */}
        <Button
          onClick={() => {
            setEditingProgram(undefined);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Program
        </Button>
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchTerm}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setSearchTerm('')}
              />
            </Badge>
          )}
          {statusFilter && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setStatusFilter('')}
              />
            </Badge>
          )}
          {fundingSourceFilter && (
            <Badge variant="secondary" className="gap-1">
              Funding: {fundingSourceFilter}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setFundingSourceFilter('')}
              />
            </Badge>
          )}
        </div>
      )}

      {/* Programs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">Error loading programs: {error.message}</p>
        </div>
      ) : programs.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            {activeFiltersCount > 0
              ? 'No programs match your filters'
              : 'No programs yet. Create your first program to get started.'}
          </p>
          {activeFiltersCount === 0 && (
            <Button
              className="mt-4"
              onClick={() => {
                setEditingProgram(undefined);
                setIsFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Program
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onEdit={handleEdit}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Total Count */}
      {programs.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {programs.length} program{programs.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Dialogs */}
      <ProgramFormDialog
        program={editingProgram}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />

      {selectedProgram && (
        <ProgramDetailDialog
          program={selectedProgram}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
}
