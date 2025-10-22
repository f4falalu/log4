import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { FileText, MapPin, Calendar, User, Package, Weight, Ruler, DollarSign, AlertTriangle, CheckCircle, XCircle, Clock, Download } from 'lucide-react';

interface RequisitionDetailProps {
  requisition: any;
  onClose: () => void;
}

export function RequisitionDetail({ requisition, onClose }: RequisitionDetailProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'emergency' 
      ? 'bg-red-50 text-red-700 border-red-200' 
      : 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const totalValue = requisition.items?.reduce((sum: number, item: any) => sum + item.total_price, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{requisition.requisition_number}</h3>
          <p className="text-sm text-muted-foreground">
            Created on {new Date(requisition.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(requisition.status)}>
            {getStatusIcon(requisition.status)}
            <span className="ml-1">{requisition.status.toUpperCase()}</span>
          </Badge>
          <Badge className={getTypeColor(requisition.requisition_type)}>
            {requisition.requisition_type === 'emergency' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {requisition.requisition_type.toUpperCase()}
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Facility Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Name:</span>
              <p className="font-medium">{requisition.facility?.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Type:</span>
              <p className="font-medium">{requisition.facility?.type}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Address:</span>
              <p className="font-medium">{requisition.facility?.address}</p>
            </div>
            {requisition.facility?.zone && (
              <div>
                <span className="text-sm text-muted-foreground">Zone:</span>
                <p className="font-medium">{requisition.facility.zone}</p>
              </div>
            )}
            {requisition.facility?.contact_person && (
              <div>
                <span className="text-sm text-muted-foreground">Contact:</span>
                <p className="font-medium">{requisition.facility.contact_person}</p>
                {requisition.facility.phone && (
                  <p className="text-sm text-muted-foreground">{requisition.facility.phone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Requisition Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="text-sm text-muted-foreground">Expected Delivery:</span>
              <p className="font-medium">
                {requisition.expected_delivery_date 
                  ? new Date(requisition.expected_delivery_date).toLocaleDateString()
                  : 'Not specified'
                }
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Created By:</span>
              <p className="font-medium">{requisition.created_by || 'System User'}</p>
            </div>
            {requisition.approved_by && (
              <div>
                <span className="text-sm text-muted-foreground">Approved By:</span>
                <p className="font-medium">{requisition.approved_by}</p>
                {requisition.approved_at && (
                  <p className="text-sm text-muted-foreground">
                    on {new Date(requisition.approved_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            {requisition.completed_at && (
              <div>
                <span className="text-sm text-muted-foreground">Completed:</span>
                <p className="font-medium">{new Date(requisition.completed_at).toLocaleDateString()}</p>
              </div>
            )}
            {requisition.invoice_url && (
              <div>
                <span className="text-sm text-muted-foreground">Invoice:</span>
                <Button variant="outline" size="sm" className="mt-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download Invoice
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{requisition.total_items}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Weight className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{requisition.total_weight.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{requisition.total_volume.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">m³</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">₦{totalValue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Requisition Items</CardTitle>
          <CardDescription>
            {requisition.items?.length || 0} item{(requisition.items?.length || 0) !== 1 ? 's' : ''} in this requisition
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requisition.items && requisition.items.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Pack Size</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Weight (kg)</TableHead>
                    <TableHead>Volume (m³)</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total Price</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requisition.items.map((item: any, index: number) => (
                    <TableRow key={item.id || index}>
                      <TableCell className="font-medium">{item.item_name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.item_code || '-'}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell>{item.pack_size || '-'}</TableCell>
                      <TableCell className="capitalize">{item.unit}</TableCell>
                      <TableCell>{item.weight_kg.toFixed(2)}</TableCell>
                      <TableCell>{item.volume_m3.toFixed(3)}</TableCell>
                      <TableCell>₦{item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">₦{item.total_price.toFixed(2)}</TableCell>
                      <TableCell className="max-w-32 truncate">{item.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in this requisition</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes and Additional Information */}
      {(requisition.notes || requisition.rejection_reason) && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requisition.notes && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Notes:</span>
                <p className="mt-1 text-sm bg-muted/50 p-3 rounded-lg">{requisition.notes}</p>
              </div>
            )}
            {requisition.rejection_reason && (
              <div>
                <span className="text-sm font-medium text-red-600">Rejection Reason:</span>
                <p className="mt-1 text-sm bg-red-50 text-red-800 p-3 rounded-lg border border-red-200">
                  {requisition.rejection_reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {requisition.status === 'approved' && (
          <Button>
            Convert to Payload
          </Button>
        )}
      </div>
    </div>
  );
}
