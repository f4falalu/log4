import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Facility } from '@/types';

interface FacilityTableProps {
  facilities: Facility[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function FacilityTable({
  facilities,
  selectedIds,
  onSelectionChange,
}: FacilityTableProps) {
  const [search, setSearch] = useState('');

  const filteredFacilities = facilities.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredFacilities.map(f => f.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (facilityId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, facilityId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== facilityId));
    }
  };

  const allSelected = filteredFacilities.length > 0 &&
    filteredFacilities.every(f => selectedIds.includes(f.id));

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search facilities..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFacilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No facilities found
                </TableCell>
              </TableRow>
            ) : (
              filteredFacilities.map((facility) => (
                <TableRow key={facility.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(facility.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(facility.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{facility.name}</TableCell>
                  <TableCell className="capitalize">{facility.type}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {facility.address}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {selectedIds.length} of {filteredFacilities.length} facilities selected
      </p>
    </div>
  );
}
