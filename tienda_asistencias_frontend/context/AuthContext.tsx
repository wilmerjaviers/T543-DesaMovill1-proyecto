import { createContext, ReactNode, useState } from "react";
import api from "../api";
import { User } from "../types";


interface AuthContextProps { 
  user: User | null; 
  login: (email: string, password: string) => Promise<void>; 
  logout: () => void;
}

export const AuthContext = createContext<AuthContextProps>({ 
  user: null, 
  login: async () => {}, 
  logout: () => {}
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    try {
      console.log("Frontend: Intentando login con", email);
      
      const res = await api.post("/auth/login", { email, password });
      
      console.log("Frontend: Respuesta recibida:", res.data);
      console.log("Frontend: Token:", res.data.token ? "Presente" : "No presente");
      console.log("Frontend: User:", res.data.user);
      
      const { token, user: userData } = res.data;
      
      if (!token) {
        throw new Error("No se recibió token del servidor");
      }
      
      if (!userData) {
        throw new Error("No se recibieron datos del usuario");
      }
      
      // Actualizar estado y configurar token para API
      setUser(userData);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      
      console.log("Frontend: Login exitoso, usuario establecido:", userData.nombre);
      
    } catch (error) {
      console.error('Frontend: Error en login:', error);
      
      // Limpiar en caso de error
      setUser(null);
      delete api.defaults.headers.common["Authorization"];
      
      // Re-lanzar el error para que el componente lo maneje
      throw error;
    }
  };

  const logout = () => {
    console.log("Frontend: Haciendo logout");
    
    // Limpiar estado y token
    setUser(null);
    delete api.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};