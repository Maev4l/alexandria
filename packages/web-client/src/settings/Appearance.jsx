import { List, Switch } from 'react-native-paper';
import { ScrollView } from 'react-native';

import { useAppPreferences } from '../components';

const Appearance = () => {
  const { darkMode, setDarkMode } = useAppPreferences();
  return (
    <ScrollView>
      <List.Item
        title="Night mode"
        right={({ color }) => (
          <Switch color={color} value={darkMode} onValueChange={() => setDarkMode(!darkMode)} />
        )}
      />
    </ScrollView>
  );
};

export default Appearance;
