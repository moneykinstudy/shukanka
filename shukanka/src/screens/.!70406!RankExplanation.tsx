import React from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

type BoxProps = { label: string; img: any; caption: string };
const Box: React.FC<BoxProps> = ({ label, img, caption }) => (
  <View style={{ width: "31%", marginBottom: 24 }}>
    <Text
      style={{
        textAlign: "center",
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 10,
        color: "#2B3A55",
      }}
      numberOfLines={1}
    >
      {label}
    </Text>

    <View
      style={{
        aspectRatio: 1,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        borderWidth: 1,
        borderColor: "#E6ECF3",
      }}
    >
      <Image source={img} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
    </View>

    <Text
      style={{
        textAlign: "center",
        marginTop: 10,
        lineHeight: 20,
        color: "#4A6072",
        fontSize: 13,
      }}
    >
      {caption}
    </Text>
  </View>
);

export default function RankExplanation() {
  const navigation = useNavigation<any>();
  const goNext = () => {
