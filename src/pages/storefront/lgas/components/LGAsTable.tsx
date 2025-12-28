import { Edit, Trash2, MapPin, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LGA } from '@/types/zones';

interface LGAsTableProps {
  lgas: LGA[];
  onRowClick: (lga: LGA) => void;
  onEdit: (lga: LGA) => void;
  onDelete: (id: string) => void;
}

export function LGAsTable({ lgas, onRowClick, onEdit, onDelete }: LGAsTableProps) {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Warehouse</TableHead>
            <TableHead>State</TableHead>
            <TableHead className="text-right">Population</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lgas.map((lga) => (
            <TableRow
              key={lga.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onRowClick(lga)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{lga.name}</span>
                </div>
              </TableCell>
              <TableCell>
                {lga.zones ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      {lga.zones.code || lga.zones.name}
                    </Badge>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Not assigned</span>
                )}
              </TableCell>
              <TableCell>
                {lga.warehouses ? (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{lga.warehouses.name}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">Not assigned</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{lga.state}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {lga.population ? (
                  <div className="flex items-center justify-end gap-2">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{lga.population.toLocaleString()}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(lga);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(lga.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
