import { useState } from 'react';
import { Plus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { usePrograms } from '@/hooks/usePrograms';
import { ProgramFormDialog } from './ProgramFormDialog';
import { ProgramFacilitiesSection } from './ProgramFacilitiesSection';
import { ProgramItemsSection } from './ProgramItemsSection';
import type { Program } from '@/types/program';

export function ProgramConfigurationTab() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | undefined>();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  const { data, isLoading, error } = usePrograms({});
  const programs = data?.programs || [];

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setIsFormOpen(true);
  };

  const handleRowClick = (program: Program) => {
    setSelectedProgram(program);
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'normal':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'closed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {selectedProgram ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setSelectedProgram(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold">{selectedProgram.name}</h2>
                <p className="text-sm text-muted-foreground">
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{selectedProgram.code}</code>
                  {' '}&middot;{' '}
                  Manage facilities and items for this program
                </p>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold">Program Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Manage program settings, funding sources, and operational parameters
              </p>
            </>
          )}
        </div>
        {!selectedProgram && (
          <Button
            onClick={() => {
              setEditingProgram(undefined);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Program
          </Button>
        )}
        {selectedProgram && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(selectedProgram);
            }}
          >
            Edit Program
          </Button>
        )}
      </div>

      {/* Programs Table (master view) */}
      {!selectedProgram && (
        <>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-destructive">Error loading programs: {error.message}</p>
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">
                No programs yet. Create your first program to get started.
              </p>
              <Button
                onClick={() => {
                  setEditingProgram(undefined);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Funding Source</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Cold Chain</TableHead>
                    <TableHead>SLA (Days)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => (
                    <TableRow
                      key={program.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(program)}
                    >
                      <TableCell className="font-medium">{program.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {program.code}
                        </code>
                      </TableCell>
                      <TableCell>{program.funding_source || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeVariant(program.priority_tier)}>
                          {program.priority_tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {program.requires_cold_chain ? (
                          <Badge variant="secondary">Yes</Badge>
                        ) : (
                          <span className="text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell>{program.sla_days || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(program.status)}>
                          {program.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(program);
                          }}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {/* Detail view: Facilities & Items for selected program */}
      {selectedProgram && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Program Facilities</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <ProgramFacilitiesSection program={selectedProgram} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Program Items</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <ProgramItemsSection program={selectedProgram} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form Dialog */}
      <ProgramFormDialog
        program={editingProgram}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}
