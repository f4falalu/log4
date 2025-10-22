export default function TestTailwind() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary text-primary-foreground">
      <div className="p-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Tailwind CSS is Working! 🎉</h1>
        <p className="mb-4">If you can see styled elements, Tailwind has been successfully configured.</p>
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">
            Primary Button
          </button>
          <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:opacity-90">
            Secondary Button
          </button>
        </div>
      </div>
    </div>
  );
}