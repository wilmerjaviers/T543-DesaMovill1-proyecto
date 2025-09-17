export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'empleado';
  id_tienda?: number; // Cambiar de tienda
}

export interface Tienda {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string;
}

export interface Asistencia {
  id: number;
  fecha: string;
  hora_entrada?: string;
  hora_salida?: string;
  empleado?: string;
}