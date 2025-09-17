import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Button, TextInput, StyleSheet } from "react-native";
import api from "../api";
import { User } from "../types";

export default function AdminHome() {
  const [empleados, setEmpleados] = useState<User[]>([]);
  const [nombre, setNombre] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const fetchEmpleados = async () => { const res = await api.get("/usuarios"); setEmpleados(res.data.filter((u: User) => u.rol==="empleado")); };
  const crearEmpleado = async () => { await api.post("/usuarios/empleado", { nombre, email, password }); setNombre(""); setEmail(""); setPassword(""); fetchEmpleados(); };
  useEffect(()=>{fetchEmpleados();}, []);
  return (<View style={styles.container}><Text style={styles.title}>Empleados</Text><TextInput placeholder="Nombre" value={nombre} onChangeText={setNombre} style={styles.input}/><TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input}/><TextInput placeholder="Contraseña" value={password} onChangeText={setPassword} secureTextEntry style={styles.input}/><Button title="Crear Empleado" onPress={crearEmpleado}/><FlatList data={empleados} keyExtractor={(item)=>item.id.toString()} renderItem={({item})=><Text>{item.nombre} - {item.email}</Text>}/></View>);
}
const styles = StyleSheet.create({ container:{flex:1,padding:20}, title:{fontSize:24, marginBottom:10}, input:{borderWidth:1,borderColor:"#ccc",padding:8,marginBottom:5,borderRadius:5} });
