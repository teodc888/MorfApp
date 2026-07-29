export const PERMISSION_MODULES = [
  { key: 'orders', label: 'Pedidos' },
  { key: 'menu', label: 'Carta' },
  { key: 'modifiers', label: 'Opciones' },
  { key: 'promotions', label: 'Promos' },
  { key: 'metrics', label: 'Métricas' },
  { key: 'insumos', label: 'Insumos' },
  { key: 'proveedores', label: 'Proveedores' },
] as const

export type PermissionKey = typeof PERMISSION_MODULES[number]['key']
