import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertTriangle,
  GitMerge,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import type { MergeConflict, MergeResult, ValueConflict, FuzzyNameConflict } from '@/lib/multi-source-parser';

export interface ConflictResolution {
  /** Resolved rows after applying user decisions */
  rows: any[];
}

interface FuzzyNameResolution {
  /** Which name to keep, or 'separate' to keep both, or 'discard' to drop both */
  action: 'keep_a' | 'keep_b' | 'separate' | 'discard';
}

interface ValueConflictResolution {
  /** Index into the values array for the chosen value */
  chosenIndex: number;
}

export interface ConflictResolverProps {
  mergeResult: MergeResult;
  onResolved: (resolution: ConflictResolution) => void;
  onBack?: () => void;
}

export function ConflictResolver({
  mergeResult,
  onResolved,
  onBack,
}: ConflictResolverProps) {
  const { merged, autoMergedCount, conflicts } = mergeResult;

  const fuzzyConflicts = useMemo(
    () => conflicts.filter((c): c is FuzzyNameConflict => c.type === 'fuzzy_name'),
    [conflicts]
  );
  const valueConflicts = useMemo(
    () => conflicts.filter((c): c is ValueConflict => c.type === 'value_conflict'),
    [conflicts]
  );

  // Resolution state
  const [fuzzyResolutions, setFuzzyResolutions] = useState<Record<number, FuzzyNameResolution>>({});
  const [valueResolutions, setValueResolutions] = useState<Record<number, ValueConflictResolution>>({});

  const allResolved = useMemo(() => {
    const fuzzyDone = fuzzyConflicts.every((_, i) => fuzzyResolutions[i] !== undefined);
    const valueDone = valueConflicts.every((_, i) => valueResolutions[i] !== undefined);
    return fuzzyDone && valueDone;
  }, [fuzzyConflicts, valueConflicts, fuzzyResolutions, valueResolutions]);

  const handleSkipAll = useCallback(() => {
    // Default: keep first value for value conflicts, keep both for fuzzy names
    const autoFuzzy: Record<number, FuzzyNameResolution> = {};
    fuzzyConflicts.forEach((_, i) => { autoFuzzy[i] = { action: 'separate' }; });
    const autoValue: Record<number, ValueConflictResolution> = {};
    valueConflicts.forEach((_, i) => { autoValue[i] = { chosenIndex: 0 }; });
    setFuzzyResolutions(autoFuzzy);
    setValueResolutions(autoValue);
  }, [fuzzyConflicts, valueConflicts]);

  const handleApply = useCallback(() => {
    // Start with a copy of merged rows
    let rows = merged.map(r => ({ ...r }));

    // Apply value conflict resolutions: update the merged row's field to the chosen value
    valueConflicts.forEach((conflict, i) => {
      const resolution = valueResolutions[i];
      if (!resolution) return;
      const chosenValue = conflict.values[resolution.chosenIndex];
      // Find the row by facility name and update the field
      const row = rows.find(
        r => (r.name || '').toString().trim().toLowerCase() ===
          conflict.facilityName.trim().toLowerCase()
      );
      if (row) {
        row[conflict.field] = chosenValue;
      }
    });

    // Apply fuzzy name conflict resolutions
    const indicesToRemove = new Set<number>();
    const namesToUpdate: { index: number; newName: string }[] = [];

    fuzzyConflicts.forEach((conflict, i) => {
      const resolution = fuzzyResolutions[i];
      if (!resolution) return;

      switch (resolution.action) {
        case 'keep_a':
          // Merge B into A, using A's name; remove B
          mergeRows(rows, conflict.rowIndexA, conflict.rowIndexB);
          namesToUpdate.push({ index: conflict.rowIndexA, newName: conflict.facilityName });
          indicesToRemove.add(conflict.rowIndexB);
          break;
        case 'keep_b':
          // Merge A into B, using B's name; remove A
          mergeRows(rows, conflict.rowIndexB, conflict.rowIndexA);
          namesToUpdate.push({ index: conflict.rowIndexB, newName: conflict.similarName });
          indicesToRemove.add(conflict.rowIndexA);
          break;
        case 'separate':
          // Keep both as-is — no action needed
          break;
        case 'discard':
          indicesToRemove.add(conflict.rowIndexA);
          indicesToRemove.add(conflict.rowIndexB);
          break;
      }
    });

    // Apply name updates
    for (const { index, newName } of namesToUpdate) {
      if (rows[index]) rows[index].name = newName;
    }

    // Remove discarded/merged rows (reverse order to preserve indices)
    rows = rows.filter((_, idx) => !indicesToRemove.has(idx));

    onResolved({ rows });
  }, [merged, fuzzyConflicts, valueConflicts, fuzzyResolutions, valueResolutions, onResolved]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="space-y-2">
        {autoMergedCount > 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {autoMergedCount} duplicate row{autoMergedCount !== 1 ? 's' : ''} auto-merged
              across sheets (exact name match).
            </AlertDescription>
          </Alert>
        )}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} need your attention.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Conflict list */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-3">
          {/* Fuzzy name conflicts */}
          {fuzzyConflicts.map((conflict, i) => (
            <div key={`fuzzy-${i}`} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GitMerge className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium">Similar names detected</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(conflict.similarity * 100)}% similar
                </Badge>
                {fuzzyResolutions[i] && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-auto" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                &ldquo;{conflict.facilityName}&rdquo; vs &ldquo;{conflict.similarName}&rdquo;
              </p>
              <RadioGroup
                value={fuzzyResolutions[i]?.action || ''}
                onValueChange={(val) =>
                  setFuzzyResolutions(prev => ({
                    ...prev,
                    [i]: { action: val as FuzzyNameResolution['action'] },
                  }))
                }
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="keep_a" id={`fuzzy-${i}-a`} />
                  <Label htmlFor={`fuzzy-${i}-a`} className="text-xs cursor-pointer">
                    Merge as &ldquo;{conflict.facilityName}&rdquo;
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="keep_b" id={`fuzzy-${i}-b`} />
                  <Label htmlFor={`fuzzy-${i}-b`} className="text-xs cursor-pointer">
                    Merge as &ldquo;{conflict.similarName}&rdquo;
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="separate" id={`fuzzy-${i}-sep`} />
                  <Label htmlFor={`fuzzy-${i}-sep`} className="text-xs cursor-pointer">
                    Keep both as separate facilities
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="discard" id={`fuzzy-${i}-drop`} />
                  <Label htmlFor={`fuzzy-${i}-drop`} className="text-xs cursor-pointer text-destructive">
                    Discard both
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ))}

          {/* Value conflicts */}
          {valueConflicts.map((conflict, i) => (
            <div key={`value-${i}`} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <span className="text-sm font-medium truncate">
                  {conflict.facilityName}
                </span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {conflict.field}
                </Badge>
                {valueResolutions[i] && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500 ml-auto" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Different values found for <span className="font-mono">{conflict.field}</span>
              </p>
              <RadioGroup
                value={valueResolutions[i]?.chosenIndex?.toString() || ''}
                onValueChange={(val) =>
                  setValueResolutions(prev => ({
                    ...prev,
                    [i]: { chosenIndex: parseInt(val, 10) },
                  }))
                }
              >
                {conflict.values.map((value, vi) => (
                  <div key={vi} className="flex items-center gap-2">
                    <RadioGroupItem value={vi.toString()} id={`value-${i}-${vi}`} />
                    <Label htmlFor={`value-${i}-${vi}`} className="text-xs cursor-pointer font-mono">
                      {value || '(empty)'}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex justify-between items-center pt-2 border-t">
        <div className="flex gap-2">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSkipAll}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Skip All Conflicts
          </Button>
        </div>
        <Button
          onClick={handleApply}
          disabled={!allResolved}
          size="sm"
        >
          Apply & Continue
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/** Merge source row's fields into target row (fill empty fields only) */
function mergeRows(rows: any[], targetIdx: number, sourceIdx: number) {
  const target = rows[targetIdx];
  const source = rows[sourceIdx];
  if (!target || !source) return;

  for (const [key, value] of Object.entries(source)) {
    const newVal = String(value || '').trim();
    const oldVal = String(target[key] || '').trim();
    if (newVal && !oldVal) {
      target[key] = value;
    }
  }
}
