import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { useDispatch } from '../store';
import { lendLibraryItem } from './operations';

export const LendItemScreenHeader = ({ route }) => {
  const {
    params: {
      item: { title },
    },
  } = route;

  return (
    <View style={{ padding: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: '18px' }} numberOfLines={1} ellipsizeMode="tail">
        Lend item
      </Text>
      <Text numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
    </View>
  );
};

const LendItem = ({ route }) => {
  const [name, setName] = useState('');
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const {
    params: { item },
  } = route;

  const handleChangeName = (v) => setName(v);

  const handleSubmit = () => dispatch(lendLibraryItem(item, name, () => navigation.goBack()));

  return (
    <View
      w="100%"
      h="100%"
      style={{
        flex: 1,
        padding: 10,
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={50}
        value={name}
        mode="outlined"
        label="Lend this item to ..."
        placeholder="Username"
        onChangeText={handleChangeName}
        style={{ width: '80%', marginBottom: 10 }}
      />
      <Button mode="contained" onPress={handleSubmit} disabled={name.length === 0}>
        SUBMIT
      </Button>
    </View>
  );
};

export default LendItem;
