export function Footer() {
  return (
    <footer className="w-full py-12 px-6 border-t border-[rgba(250,245,238,0.08)] bg-[#2a1f1a]">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center md:items-start gap-2">
          <span className="text-xl font-headline italic text-primary">MorfApp</span>
          <p className="font-body text-sm tracking-wide" style={{ color: 'rgba(250,245,238,0.55)' }}>© 2026 MorfApp — Todos los derechos reservados.</p>
        </div>
        <nav className="flex flex-wrap justify-center md:justify-end gap-6 font-body text-sm tracking-wide">
          <a className="hover:text-primary transition-colors" style={{ color: 'rgba(250,245,238,0.55)' }} href="#">Política de privacidad</a>
          <a className="hover:text-primary transition-colors" style={{ color: 'rgba(250,245,238,0.55)' }} href="#">Términos de uso</a>
          <a className="hover:text-primary transition-colors" style={{ color: 'rgba(250,245,238,0.55)' }} href="/contacto">Soporte</a>
          <a className="hover:text-primary transition-colors" style={{ color: 'rgba(250,245,238,0.55)' }} href="#">Panel admin</a>
        </nav>
      </div>
    </footer>
  );
}
