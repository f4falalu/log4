import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ItemCategory } from '@/types/items';

interface ItemCategoryBadgeProps {
  category: ItemCategory;
  className?: string;
}

const categoryColors: Record<ItemCategory, string> = {
  Tablet: 'bg-blue-100 text-blue-800',
  Insertion: 'bg-purple-100 text-purple-800',
  Capsule: 'bg-green-100 text-green-800',
  Suspension: 'bg-yellow-100 text-yellow-800',
  Syrup: 'bg-orange-100 text-orange-800',
  Injection: 'bg-red-100 text-red-800',
  Intravenous: 'bg-pink-100 text-pink-800',
  'Oral Fluid': 'bg-cyan-100 text-cyan-800',
  'Opthal-Mics': 'bg-teal-100 text-teal-800',
  Cream: 'bg-lime-100 text-lime-800',
  Extemporaneous: 'bg-amber-100 text-amber-800',
  Consummable: 'bg-slate-100 text-slate-800',
  Aerosol: 'bg-indigo-100 text-indigo-800',
  Vaccine: 'bg-emerald-100 text-emerald-800',
  Powder: 'bg-stone-100 text-stone-800',
  Device: 'bg-zinc-100 text-zinc-800',
};

export function ItemCategoryBadge({ category, className }: ItemCategoryBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-normal',
        categoryColors[category] || 'bg-gray-100 text-gray-800',
        className
      )}
    >
      {category}
    </Badge>
  );
}
