export function Footer() {
  return (
    <footer className="w-full py-12 px-6 border-t border-[#d8d0c8]/60 bg-[#faf5ee]">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-xl font-headline italic text-primary">MorfApp</span>
          <p className="text-on-surface-variant font-body text-sm tracking-wide">© 2026 MorfApp — Todos los derechos reservados.</p>
        </div>
        <nav className="flex flex-wrap justify-center md:justify-end gap-6 font-body text-sm tracking-wide">
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Política de privacidad</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Términos de uso</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="/contacto">Soporte</a>
          <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">Panel admin</a>
        </nav>
      </div>
    </footer>
  );
}
