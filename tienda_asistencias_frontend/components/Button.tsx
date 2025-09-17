import React from "react";
import { Button as RNButton } from "react-native";
interface Props { title: string; onPress: () => void; }
export default function Button({ title, onPress }: Props) { return <RNButton title={title} onPress={onPress} />; }
