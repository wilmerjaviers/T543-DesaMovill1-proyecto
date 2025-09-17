import React from "react";
import { TextInput, StyleSheet } from "react-native";

interface Props { placeholder: string; value: string; onChangeText: (text: string) => void; secureTextEntry?: boolean; }
export default function Input({ placeholder, value, onChangeText, secureTextEntry }: Props) {
  return <TextInput style={styles.input} placeholder={placeholder} value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry} />;
}
const styles = StyleSheet.create({ input: { borderWidth: 1, borderColor: "#ccc", padding: 10, marginBottom: 10, borderRadius: 5 } });
