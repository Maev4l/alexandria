import { List, Divider } from 'react-native-paper';
import { ScrollView } from 'react-native';

const SettingsScreen = ({ navigation }) => (
  <ScrollView>
    <List.Item
      title="Account"
      left={(props) => <List.Icon {...props} icon="account" />}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => {
        navigation.navigate('Account');
      }}
    />
    <Divider />
    <List.Item
      title="Appearance"
      left={(props) => <List.Icon {...props} icon="white-balance-sunny" />}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => {
        navigation.navigate('Appearance');
      }}
    />
    <Divider />
    <List.Item
      title="About"
      left={(props) => <List.Icon {...props} icon="information-outline" />}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => {
        navigation.navigate('About');
      }}
    />
  </ScrollView>
);

export default SettingsScreen;
