export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">Stocka</h1>
        <p className="text-muted-foreground mb-8">Система за управление на фактури</p>
        <a
          href="/login"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Започнете
        </a>
      </div>
    </div>
  );
}
