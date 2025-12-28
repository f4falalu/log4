// Using standard Web API types that are available in Deno
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

interface ParsedItem {
  item_name: string;
  quantity: number;
  unit: string;
  weight_kg?: number;
  volume_m3?: number;
  temperature_required: boolean;
  handling_instructions?: string;
}

interface ParseResult {
  success: boolean;
  items: ParsedItem[];
  warnings: string[];
  error?: string;
}

// Helper function to extract text from PDF
async function extractPDFText(pdfBuffer: Uint8Array): Promise<string> {
  // For now, we'll use a simple text extraction approach
  // In production, you might want to use a more robust library like pdf-parse
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(pdfBuffer);
}

// Parse text to find requisition items
function parseRequisitionText(text: string): ParseResult {
  const items: ParsedItem[] = [];
  const warnings: string[] = [];

  try {
    // Clean up the text
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line);

    // Common patterns for item lines in requisition PDFs
    // Pattern 1: "Item Name | Quantity | Unit" format
    const pattern1 = /^(.+?)\s*[\|\t]\s*(\d+\.?\d*)\s*[\|\t]\s*(\w+)/i;
    
    // Pattern 2: "Quantity Unit Item Name" format
    const pattern2 = /^(\d+\.?\d*)\s+(\w+)\s+(.+)$/i;
    
    // Pattern 3: "Item Name: Quantity Unit" format
    const pattern3 = /^(.+?):\s*(\d+\.?\d*)\s*(\w+)/i;

    let itemCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip header-like lines
      if (line.match(/^(item|product|description|name|quantity|qty|unit)/i) && line.length < 50) {
        continue;
      }

      let match;
      let itemName = '';
      let quantity = 0;
      let unit = 'units';

      // Try pattern 1
      match = line.match(pattern1);
      if (match) {
        itemName = match[1].trim();
        quantity = parseFloat(match[2]);
        unit = match[3].trim();
      }

      // Try pattern 2 if pattern 1 didn't match
      if (!match) {
        match = line.match(pattern2);
        if (match) {
          quantity = parseFloat(match[1]);
          unit = match[2].trim();
          itemName = match[3].trim();
        }
      }

      // Try pattern 3 if pattern 2 didn't match
      if (!match) {
        match = line.match(pattern3);
        if (match) {
          itemName = match[1].trim();
          quantity = parseFloat(match[2]);
          unit = match[3].trim();
        }
      }

      // If we found an item, add it
      if (itemName && quantity > 0 && itemName.length > 2 && itemName.length < 200) {
        // Check for temperature/cold chain keywords
        const lowerLine = line.toLowerCase();
        const tempRequired = lowerLine.includes('cold') || 
                           lowerLine.includes('refrigerat') || 
                           lowerLine.includes('frozen') ||
                           lowerLine.includes('temperature');

        items.push({
          item_name: itemName,
          quantity: quantity,
          unit: unit,
          temperature_required: tempRequired,
        });

        itemCount++;

        // Limit to prevent processing too many items
        if (itemCount >= 500) {
          warnings.push('Stopped parsing after 500 items. Consider splitting large requisitions.');
          break;
        }
      }
    }

    // Add warnings
    if (items.length === 0) {
      warnings.push('No items found. PDF may not be in a supported format.');
    }

    if (items.length < 5 && lines.length > 20) {
      warnings.push('Few items extracted. The PDF format may not be fully supported.');
    }

    // Check for items without proper quantities
    items.forEach((item, idx) => {
      if (item.quantity > 1000) {
        warnings.push(`Row ${idx + 1}: High quantity detected (${item.quantity})`);
      }
    });

    return {
      success: items.length > 0,
      items,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      items: [],
      warnings: [],
      error: error instanceof Error ? error.message : 'Unknown parsing error',
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get the file from the request
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check file type
    if (!file.name.endsWith('.pdf')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only PDF files are supported' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: 'File size exceeds 10MB limit' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Extract text from PDF
    const text = await extractPDFText(buffer);

    // Parse the extracted text
    const result = parseRequisitionText(text);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error parsing PDF:', error);
    return new Response(
      JSON.stringify({
        success: false,
        items: [],
        warnings: [],
        error: error instanceof Error ? error.message : 'Failed to parse PDF',
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
})
