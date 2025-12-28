import { useState } from 'react';
import { useDriverDocuments, useUploadDriverDocument, useDeleteDriverDocument, useUpdateDocumentStatus, type DriverDocument } from '@/hooks/useDriverDocuments';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Upload,
  Trash2,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface DriverDocumentsPanelProps {
  driverId: string;
  driverName: string;
  isOpen: boolean;
  onClose: () => void;
}

const DOCUMENT_TYPES = [
  'Driver License',
  'Insurance',
  'Medical Certificate',
  'Background Check',
  'Vehicle Registration',
  'Safety Training',
  'Other',
];

export function DriverDocumentsPanel({
  driverId,
  driverName,
  isOpen,
  onClose
}: DriverDocumentsPanelProps) {
  const { data: documents = [], isLoading } = useDriverDocuments(driverId);
  const uploadDocument = useUploadDriverDocument();
  const deleteDocument = useDeleteDriverDocument();
  const updateStatus = useUpdateDocumentStatus();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DriverDocument | null>(null);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      alert('Please select a file and document type');
      return;
    }

    await uploadDocument.mutateAsync({
      driverId,
      file: selectedFile,
      documentType,
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setSelectedFile(null);
    setDocumentType('');
    setExpiryDate('');
    setNotes('');
    setUploadDialogOpen(false);
  };

  const handleDelete = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      await deleteDocument.mutateAsync({ documentId, driverId });
    }
  };

  const handleApprove = async (documentId: string) => {
    await updateStatus.mutateAsync({
      documentId,
      driverId,
      status: 'approved',
    });
  };

  const handleReject = async (documentId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      await updateStatus.mutateAsync({
        documentId,
        driverId,
        status: 'rejected',
        notes: reason,
      });
    }
  };

  const getStatusBadge = (doc: DriverDocument) => {
    // Check expiry first
    if (doc.expiryDate) {
      const expiryDate = new Date(doc.expiryDate);
      const today = new Date();
      const thirtyDaysFromNow = addDays(today, 30);

      if (isBefore(expiryDate, today)) {
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Expired
          </Badge>
        );
      }

      if (isBefore(expiryDate, thirtyDaysFromNow)) {
        return (
          <Badge variant="outline" className="gap-1 border-warning text-warning">
            <AlertTriangle className="h-3 w-3" />
            Expiring Soon
          </Badge>
        );
      }
    }

    // Status badges
    switch (doc.status) {
      case 'approved':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents - {driverName}
            </DialogTitle>
            <DialogDescription>
              View and manage driver documents, licenses, and certificates
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between py-2">
            <div className="text-sm text-muted-foreground">
              {documents.length} document{documents.length !== 1 ? 's' : ''} on file
            </div>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              size="sm"
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Document
            </Button>
          </div>

          <ScrollArea className="h-[500px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <FileText className="h-12 w-12 mb-2 opacity-20" />
                <p>No documents uploaded yet</p>
                <Button
                  variant="link"
                  onClick={() => setUploadDialogOpen(true)}
                  className="mt-2"
                >
                  Upload your first document
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-medium">{doc.documentType}</h4>
                          {getStatusBadge(doc)}
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">File:</span>
                            <span className="truncate">{doc.fileName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Size:</span>
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Uploaded:</span>
                            <span>{format(new Date(doc.uploadDate), 'MMM dd, yyyy')}</span>
                          </div>
                          {doc.expiryDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span className="font-medium">Expires:</span>
                              <span className={cn(
                                isBefore(new Date(doc.expiryDate), new Date()) && 'text-destructive font-semibold',
                                isBefore(new Date(doc.expiryDate), addDays(new Date(), 30)) && 'text-warning font-semibold'
                              )}>
                                {format(new Date(doc.expiryDate), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          )}
                        </div>

                        {doc.notes && (
                          <div className="text-sm">
                            <span className="font-medium">Notes:</span>
                            <p className="text-muted-foreground mt-1">{doc.notes}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDocument(doc);
                            setViewDialogOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>

                        {doc.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(doc.id)}
                              className="gap-2 bg-success hover:bg-success/90"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(doc.id)}
                              className="gap-2"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(doc.fileUrl, '_blank')}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(doc.id)}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document for {driverName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="document-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry-date">Expiry Date (Optional)</Label>
              <Input
                id="expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes about this document..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUploadDialogOpen(false)}
              disabled={uploadDocument.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !documentType || uploadDocument.isPending}
            >
              {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedDocument?.documentType}
            </DialogTitle>
            <DialogDescription>
              {selectedDocument?.fileName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {selectedDocument?.mimeType?.startsWith('image/') ? (
              <img
                src={selectedDocument.fileUrl}
                alt={selectedDocument.fileName}
                className="w-full h-auto rounded-lg"
              />
            ) : selectedDocument?.mimeType === 'application/pdf' ? (
              <iframe
                src={selectedDocument.fileUrl}
                className="w-full h-[600px] rounded-lg"
                title={selectedDocument.fileName}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-20" />
                <p>Preview not available for this file type</p>
                <Button
                  variant="link"
                  onClick={() => window.open(selectedDocument?.fileUrl, '_blank')}
                  className="mt-2"
                >
                  Open in new tab
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => window.open(selectedDocument?.fileUrl, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
