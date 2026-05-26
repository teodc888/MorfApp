export function StorePaginaNoDisponible({ tenantName }: { tenantName: string }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3730a3 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      {/* Card principal */}
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        {/* Icono */}
        <div style={{
          width: '72px', height: '72px',
          background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '32px'
        }}>
          🔒
        </div>

        {/* Título */}
        <h1 style={{
          fontSize: '22px', fontWeight: '700',
          color: '#111827', margin: '0 0 12px',
          lineHeight: '1.3'
        }}>
          Página no disponible
        </h1>

        {/* Subtítulo */}
        <p style={{
          fontSize: '15px', color: '#6b7280',
          margin: '0 0 32px', lineHeight: '1.6'
        }}>
          El servicio de <strong style={{ color: '#374151' }}>{tenantName}</strong> no está activo en este momento.
        </p>

        {/* Divider */}
        <div style={{ height: '1px', background: '#f3f4f6', margin: '0 0 24px' }} />

        {/* MorfApp branding */}
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0 }}>
          Powered by{' '}
          <span style={{ color: '#6366f1', fontWeight: '600' }}>MorfApp</span>
        </p>
      </div>

      {/* Footer */}
      <p style={{
        marginTop: '32px', fontSize: '13px',
        color: 'rgba(255,255,255,0.6)', textAlign: 'center'
      }}>
        Si creés que esto es un error, contactá al administrador.
      </p>
    </div>
  )
}
