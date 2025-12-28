import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateCSVTemplate } from '@/lib/csvParser';

export function CSVTemplateButton() {
  const handleDownload = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'requisition_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDownload}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Download CSV Template
    </Button>
  );
}
