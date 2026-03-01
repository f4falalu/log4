// MOD4 Calendar Legend
// Color legend for the delivery calendar

export function CalendarLegend() {
  const legendItems = [
    { color: 'bg-success', label: 'Completed' },
    { color: 'bg-warning', label: 'Mixed' },
    { color: 'bg-accent', label: 'Scheduled' },
  ];

  return (
    <div className="flex items-center justify-center gap-4 px-4 py-3 bg-secondary/30 border-t border-border/50">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-primary ring-1 ring-primary ring-offset-1 ring-offset-background" />
        <span className="text-xs text-muted-foreground">Today</span>
      </div>
    </div>
  );
}
