import { View } from 'react-native';
import { Button, TextInput, Text, useTheme } from 'react-native-paper';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import { useDispatch } from '../store';
import { signin } from './operations';
import { PasswordInput } from '../components';

const SignIn = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleChangeUsername = (val) => setUsername(val);
  const handleChangePassword = (val) => setPassword(val);

  const handleSignIn = async () => {
    dispatch(signin(username, password));
  };

  return (
    <View
      w="100%"
      h="100%"
      style={{
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="headlineMedium" style={{ fontWeight: 500 }}>
        ALEXANDRIA
      </Text>
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={username}
        mode="outlined"
        label="Username"
        placeholder="Enter username"
        onChangeText={handleChangeUsername}
        style={{ marginBottom: 10, width: '80%' }}
      />
      <PasswordInput
        value={password}
        label="Password"
        mode="outlined"
        placeholder="Enter password"
        onChangeText={handleChangePassword}
        style={{ marginBottom: 10, width: '80%' }}
      />
      <Button mode="contained" onPress={handleSignIn}>
        SIGN IN
      </Button>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 10,
        }}
      >
        <Text>Don&apos;t have an account ?</Text>
        <Text
          onPress={() => navigation.navigate('SignUp')}
          style={{ marginLeft: 5, color: theme.colors.primary }}
        >
          Sign Up
        </Text>
      </View>
    </View>
  );
};

export default SignIn;
