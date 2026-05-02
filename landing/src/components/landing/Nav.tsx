export function Nav() {
  return (
    <header className="fixed top-0 w-full z-50 bg-[#faf5ee]/90 backdrop-blur-md border-b border-[#d8d0c8]/60 shadow-[0_2px_16px_rgba(58,48,42,0.04)]">
      <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
        <a className="text-2xl font-headline italic font-bold text-primary" href="/">
          MorfApp
        </a>
        <nav className="hidden md:flex gap-8 items-center">
          <a
            className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight"
            href="/#features"
          >
            Funciones
          </a>
          <a
            className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight"
            href="/#pricing"
          >
            Planes
          </a>
          <a
            className="text-on-surface-variant font-medium hover:text-primary transition-colors font-headline text-lg tracking-tight"
            href="/contacto"
          >
            Contacto
          </a>
        </nav>
        <a
          className="hidden md:inline-flex items-center justify-center bg-primary text-on-primary px-6 py-2 rounded font-medium hover:bg-surface-tint transition-colors font-body"
          href="/#pricing"
        >
          Empezar gratis
        </a>
        <button className="md:hidden text-primary">
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
      </div>
    </header>
  );
}
