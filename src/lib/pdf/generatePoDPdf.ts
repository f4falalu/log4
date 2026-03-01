// MOD4 PoD PDF Generator
// Generate downloadable PDF for Proof of Delivery records

import { jsPDF } from 'jspdf';
import { ProofOfDelivery, DiscrepancyReason } from '@/lib/db/schema';
import { format } from 'date-fns';

const DISCREPANCY_LABELS: Record<DiscrepancyReason, string> = {
  damaged_in_transit: 'Damaged in Transit',
  short_shipment: 'Short Shipment',
  wrong_item: 'Wrong Item',
  refused_by_recipient: 'Refused by Recipient',
  item_not_found: 'Item Not Found',
  other: 'Other',
};

export async function generatePoDPdf(pod: ProofOfDelivery): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  // Colors (as tuples)
  const primary: [number, number, number] = [245, 158, 11];
  const success: [number, number, number] = [34, 197, 94];
  const warning: [number, number, number] = [245, 158, 11];
  const textDark: [number, number, number] = [30, 41, 59];
  const textMuted: [number, number, number] = [100, 116, 139];

  // Helper functions
  const drawLine = (yPos: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  const addSection = (title: string, yPos: number): number => {
    doc.setFontSize(10);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin, yPos);
    return yPos + 6;
  };

  // Header
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PROOF OF DELIVERY', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`ID: ${pod.id}`, margin, 28);
  doc.text(format(pod.delivered_at, 'PPpp'), pageWidth - margin, 28, { align: 'right' });

  y = 45;

  // Status badge
  const isFlagged = pod.status === 'flagged';
  const badgeColor = isFlagged ? warning : success;
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(margin, y, 40, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isFlagged ? 'FLAGGED' : 'COMPLETED', margin + 20, y + 5.5, { align: 'center' });

  y += 18;

  // Facility section
  y = addSection('Facility', y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(pod.facility_name, margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Facility ID: ${pod.facility_id}`, margin, y);
  
  y += 10;
  drawLine(y);
  y += 8;

  // Items section
  y = addSection('Items Delivered', y);
  
  // Table header
  doc.setFontSize(8);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Item', margin, y);
  doc.text('Expected', pageWidth - margin - 45, y);
  doc.text('Delivered', pageWidth - margin - 15, y);
  y += 5;

  // Items
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(9);
  let totalExpected = 0;
  let totalDelivered = 0;

  for (const item of pod.items) {
    const isMatch = item.expected_quantity === item.delivered_quantity;
    doc.setFont('helvetica', 'normal');
    doc.text(item.name, margin, y, { maxWidth: 90 });
    doc.text(String(item.expected_quantity), pageWidth - margin - 45, y);
    
    if (!isMatch) {
      doc.setTextColor(warning[0], warning[1], warning[2]);
    }
    doc.text(String(item.delivered_quantity), pageWidth - margin - 15, y);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    
    totalExpected += item.expected_quantity;
    totalDelivered += item.delivered_quantity;
    y += 5;
  }

  // Total
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', margin, y);
  doc.text(String(totalExpected), pageWidth - margin - 45, y);
  doc.text(String(totalDelivered), pageWidth - margin - 15, y);

  y += 8;
  drawLine(y);
  y += 8;

  // Discrepancy section (if any)
  if (pod.has_discrepancy && pod.discrepancy_reason) {
    y = addSection('Discrepancy', y);
    doc.setTextColor(warning[0], warning[1], warning[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(DISCREPANCY_LABELS[pod.discrepancy_reason], margin, y);
    y += 5;
    
    if (pod.discrepancy_notes) {
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(pod.discrepancy_notes, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 4 + 3;
    }
    
    y += 5;
    drawLine(y);
    y += 8;
  }

  // Recipient section
  y = addSection('Recipient Attestation', y);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(pod.recipient_name, margin, y);
  y += 5;
  
  if (pod.recipient_role) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(pod.recipient_role, margin, y);
    y += 5;
  }

  y += 3;

  // Signature (if available and valid base64)
  if (pod.recipient_signature_url && pod.recipient_signature_url.startsWith('data:image')) {
    try {
      doc.addImage(pod.recipient_signature_url, 'PNG', margin, y, 50, 20);
      y += 25;
    } catch (e) {
      // Skip if image fails to load
      y += 5;
    }
  }

  y += 3;
  drawLine(y);
  y += 8;

  // Location section
  y = addSection('Location Verification', y);
  
  if (pod.is_proxy_delivery) {
    doc.setTextColor(warning[0], warning[1], warning[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Proxy Delivery', margin, y);
    y += 5;
    
    if (pod.proxy_reason) {
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Reason: ${pod.proxy_reason}`, margin, y);
      y += 4;
    }
  } else {
    doc.setTextColor(success[0], success[1], success[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Within delivery zone', margin, y);
    y += 5;
  }

  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `GPS: ${pod.delivery_latitude.toFixed(6)}, ${pod.delivery_longitude.toFixed(6)} (±${Math.round(pod.location_accuracy_m)}m)`,
    margin, y
  );

  y += 10;
  drawLine(y);
  y += 8;

  // Photo (if available)
  if (pod.photo_url && pod.photo_url.startsWith('data:image')) {
    y = addSection('Photo Evidence', y);
    try {
      doc.addImage(pod.photo_url, 'PNG', margin, y, 60, 45);
      y += 50;
    } catch (e) {
      // Skip if image fails
    }
    y += 5;
    drawLine(y);
    y += 8;
  }

  // Footer metadata
  doc.setFontSize(7);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text(`Batch ID: ${pod.batch_id}`, margin, y);
  doc.text(`Driver ID: ${pod.driver_id}`, margin + 50, y);
  doc.text(`Slot ID: ${pod.slot_id}`, margin + 100, y);
  y += 4;
  doc.text(`Generated: ${format(new Date(), 'PPpp')}`, margin, y);
  
  if (pod.synced_at) {
    doc.text(`Synced: ${format(pod.synced_at, 'PPpp')}`, margin + 70, y);
  }

  // Return as blob
  return doc.output('blob');
}

export async function downloadPoDPdf(pod: ProofOfDelivery): Promise<void> {
  const blob = await generatePoDPdf(pod);
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `pod_${pod.id}_${format(pod.delivered_at, 'yyyy-MM-dd')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}