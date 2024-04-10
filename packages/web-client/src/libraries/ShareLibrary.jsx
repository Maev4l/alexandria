import { View } from 'react-native';
import { TextInput, Text, Button } from 'react-native-paper';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { useSelector, useDispatch } from '../store';

import { shareLibrary } from './operations';

export const ShareLibraryScreenHeader = ({ route }) => {
  const {
    params: {
      library: { name },
    },
  } = route;

  return (
    <View style={{ padding: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: '18px' }} numberOfLines={1} ellipsizeMode="tail">
        Share library
      </Text>
      <Text numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
    </View>
  );
};

const ShareLibrary = ({ route }) => {
  const {
    params: {
      library: { id: libraryId, sharedTo },
    },
  } = route;
  const [username, setUsername] = useState('');
  const [usernameValidity, setUsernameValidity] = useState(false);
  const self = useSelector((state) => state.authn.token.payload['cognito:username']);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleChangeUsername = (val) => {
    setUsername(val);
    const valid =
      /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/.test(
        val,
      );
    let alreadySharedWithSameUser = false;
    if (sharedTo && sharedTo.length > 0) {
      const index = sharedTo.findIndex(val);
      if (index !== -1) {
        alreadySharedWithSameUser = true;
      }
    }
    setUsernameValidity(valid && self !== val && !alreadySharedWithSameUser);
  };

  const handleSubmit = () =>
    dispatch(shareLibrary(libraryId, username, () => navigation.navigate('Libraries')));

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
        value={username}
        mode="outlined"
        label="Share library with ..."
        placeholder="Username"
        onChangeText={handleChangeUsername}
        style={{ width: '80%', marginBottom: 10 }}
      />
      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={username.length === 0 || !usernameValidity}
      >
        SUBMIT
      </Button>
    </View>
  );
};

export default ShareLibrary;
