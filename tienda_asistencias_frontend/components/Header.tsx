import React from "react";
import { View, Image, StyleSheet } from "react-native";
export default function Header() {
  return (<View style={styles.container}><Image source={require("../assets/header.png")} style={styles.logo} /></View>);
}
const styles = StyleSheet.create({ container: { alignItems: "center", marginVertical: 10 }, logo: { width: 200, height: 80, resizeMode: "contain" } });
