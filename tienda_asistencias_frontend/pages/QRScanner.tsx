import React, { useEffect, useState } from "react";
import { Text, View, StyleSheet, Button } from "react-native";
import { BarCodeScanner } from "expo-barcode-scanner";

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState<boolean|null>(null);
  const [scanned, setScanned] = useState(false);
  useEffect(()=>{(async()=>{const {status} = await BarCodeScanner.requestPermissionsAsync(); setHasPermission(status==="granted");})();},[]);
  const handleBarCodeScanned=({data}:{data:string})=>{setScanned(true); alert(`Empleado ID: ${data}`);}
  if(hasPermission===null) return <Text>Solicitando permiso...</Text>;
  if(hasPermission===false) return <Text>Sin acceso a la cámara</Text>;
  return(<View style={styles.container}><BarCodeScanner onBarCodeScanned={scanned?undefined:handleBarCodeScanned} style={StyleSheet.absoluteFillObject}/>{scanned&&<Button title="Escanear de nuevo" onPress={()=>setScanned(false)}/>}</View>);
}
const styles = StyleSheet.create({ container:{flex:1} });
