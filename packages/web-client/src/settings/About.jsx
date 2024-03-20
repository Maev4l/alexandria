import { View } from "react-native";
import { Text, Divider } from "react-native-paper";

const About = () => (
  <View style={{ padding: 10 }}>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      <Text>Version</Text>
      <Text>{process.env.version}</Text>
    </View>
    <Divider />
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      <Text>Build</Text>
      <Text>
        {/* Shorten to short commit hash */}
        {process.env.commitHash.slice(0, 7)}
      </Text>
    </View>
  </View>
);

export default About;
