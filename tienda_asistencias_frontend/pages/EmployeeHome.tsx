import React, { useState } from "react";
import { View, Button, StyleSheet, Text } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAuth } from "../context/useAuth";

export default function EmployeeHome() {
  const { user } = useAuth();
  const [showQR, setShowQR] = useState(false);
  return (<View style={styles.container}><Text style={styles.title}>Empleado: {user?.nombre}</Text><Button title="Generar QR" onPress={()=>setShowQR(true)}/>{showQR && <QRCode value={user?.id.toString()||""} size={200}/>}</View>);
}
const styles = StyleSheet.create({ container:{flex:1, justifyContent:"center", alignItems:"center"}, title:{fontSize:20, marginBottom:20} });
