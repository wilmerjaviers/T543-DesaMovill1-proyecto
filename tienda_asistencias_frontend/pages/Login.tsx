import React, { useState } from "react";
import { View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useAuth } from "../context/useAuth";
import Header from "../components/Header";
import Input from "../components/Input";
import Button from "../components/Button";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Por favor ingresa email y contraseña");
      return;
    }

    console.log("Frontend: Iniciando login...");
    setLoading(true);
    
    try {
      await login(email.trim(), password);
      console.log("Frontend: Login completado exitosamente");
    } catch (error) {
      console.error("Frontend: Error en handleLogin:", error);
      
      let errorMessage = "Error de conexión";
      // Narrow error type to access its properties safely
      if (typeof error === "object" && error !== null) {
        const err = error as { response?: any; request?: any; message?: string };
        if (err.response) {
          // Error del servidor
          console.log("Frontend: Error response:", err.response.data);
          errorMessage = err.response.data?.message || "Credenciales incorrectas";
        } else if (err.request) {
          // Error de red
          console.log("Frontend: Error de red:", err.request);
          errorMessage = "No se pudo conectar al servidor";
        } else {
          // Otro error
          console.log("Frontend: Error desconocido:", err.message);
          errorMessage = err.message || "Error desconocido";
        }
      } else {
        errorMessage = String(error) || "Error desconocido";
      }
      
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      
      <Input 
        placeholder="Email" 
        value={email} 
        onChangeText={setEmail}
      />
      
      <Input 
        placeholder="Contraseña" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
      />
      
      {loading ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : (
        <Button title="Ingresar" onPress={handleLogin} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ 
  container: { 
    flex: 1, 
    justifyContent: "center", 
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  loader: {
    marginVertical: 20
  }
});