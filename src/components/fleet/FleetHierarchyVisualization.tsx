import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TreePine, Building2, Truck, Users, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { useFleets } from '@/hooks/useFleets';
import { Fleet } from '@/hooks/useFleets';

interface FleetNode extends Fleet {
  children: FleetNode[];
  level: number;
}

interface FleetHierarchyVisualizationProps {
  onCreateSubFleet?: (parentFleetId: string) => void;
  onEditFleet?: (fleet: Fleet) => void;
}

export function FleetHierarchyVisualization({ 
  onCreateSubFleet, 
  onEditFleet 
}: FleetHierarchyVisualizationProps) {
  const { data: fleets = [], isLoading } = useFleets();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [hierarchyData, setHierarchyData] = useState<FleetNode[]>([]);

  useEffect(() => {
    if (fleets.length > 0) {
      const hierarchy = buildHierarchy(fleets);
      setHierarchyData(hierarchy);
      
      // Auto-expand root nodes
      const rootNodes = hierarchy.map(node => node.id);
      setExpandedNodes(new Set(rootNodes));
    }
  }, [fleets]);

  const buildHierarchy = (fleets: Fleet[]): FleetNode[] => {
    const fleetMap = new Map<string, FleetNode>();
    const rootFleets: FleetNode[] = [];

    // Initialize all fleets as nodes
    fleets.forEach(fleet => {
      fleetMap.set(fleet.id, {
        ...fleet,
        children: [],
        level: 0
      });
    });

    // Build parent-child relationships
    fleets.forEach(fleet => {
      const node = fleetMap.get(fleet.id)!;
      
      if (fleet.parent_fleet_id && fleetMap.has(fleet.parent_fleet_id)) {
        const parent = fleetMap.get(fleet.parent_fleet_id)!;
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        rootFleets.push(node);
      }
    });

    return rootFleets;
  };

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'inactive': return 'bg-muted/30 text-muted-foreground border-muted/50';
      default: return 'bg-muted/30 text-muted-foreground border-muted/50';
    }
  };

  const renderFleetNode = (node: FleetNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const indentLevel = node.level * 24;

    return (
      <div key={node.id} className="select-none">
        {/* Fleet Node */}
        <div 
          className="flex items-center gap-2 p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors"
          style={{ marginLeft: `${indentLevel}px` }}
        >
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleExpanded(node.id)}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )
            ) : (
              <div className="h-4 w-4" />
            )}
          </Button>

          {/* Fleet Icon */}
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
            <Building2 className="h-4 w-4 text-primary" />
          </div>

          {/* Fleet Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{node.name}</span>
              <Badge className={getStatusColor(node.status)}>
                {node.status}
              </Badge>
              {node.vendor && (
                <Badge variant="outline" className="text-xs">
                  {node.vendor.name}
                </Badge>
              )}
            </div>
            {node.mission && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {node.mission}
              </p>
            )}
          </div>

          {/* Fleet Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Truck className="h-4 w-4" />
              <span>{node.vehicle_count || 0}</span>
            </div>
            {hasChildren && (
              <div className="flex items-center gap-1">
                <TreePine className="h-4 w-4" />
                <span>{node.children.length}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onCreateSubFleet && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateSubFleet(node.id);
                }}
                className="h-8 w-8 p-0"
                title="Create sub-fleet"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {onEditFleet && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditFleet(node);
                }}
                className="h-8 px-3"
              >
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="ml-6 border-l-2 border-muted">
            {node.children.map(child => renderFleetNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <TreePine className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Loading fleet hierarchy...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fleets.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No fleets found</p>
            <p className="text-sm">Create your first fleet to see the hierarchy visualization</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TreePine className="h-5 w-5" />
          Fleet Hierarchy
        </CardTitle>
        <CardDescription>
          Organizational structure showing fleet relationships and sub-fleets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Hierarchy Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {hierarchyData.length}
            </div>
            <div className="text-sm text-muted-foreground">Root Fleets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {fleets.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Fleets</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {fleets.reduce((sum, fleet) => sum + (fleet.vehicle_count || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Vehicles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {fleets.filter(f => f.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Fleets</div>
          </div>
        </div>

        {/* Hierarchy Tree */}
        <div className="space-y-1">
          {hierarchyData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TreePine className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No fleet hierarchy to display</p>
              <p className="text-sm">All fleets are independent with no parent-child relationships</p>
            </div>
          ) : (
            hierarchyData.map(node => renderFleetNode(node))
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Legend</h4>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Fleet</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span>Vehicle Count</span>
            </div>
            <div className="flex items-center gap-2">
              <TreePine className="h-4 w-4" />
              <span>Sub-fleets</span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4" />
              <span>Expand/Collapse</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
