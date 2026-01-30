export default function PlaybackMapPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 bg-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Playback Mode</h1>
          <p className="text-muted-foreground">
            Historical replay with analytics and stop duration insights
          </p>
          <p className="text-sm text-muted-foreground">
            Timeline controls and analytics coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
