import { useState } from 'react';
import { View } from 'react-native';
import { TextInput, useTheme, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { PasswordInput } from '../components';
import PasswordPolicyChecker from './PasswordPolicyChecker';
import { useDispatch } from '../store';
import { signup } from './operations';

const SignUp = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [complexityValid, setComplexityValidity] = useState(false);
  const [emailValid, setEmailValidity] = useState(true);

  const handleEmailChange = (v) => {
    if (v !== '') {
      const valid =
        /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/.test(
          v,
        );
      setEmailValidity(valid);
    } else {
      setEmailValidity(true);
    }
    setEmail(v);
  };
  const handleDisplayNameChange = (v) => setDisplayName(v);
  const handlePasswordChange = (v) => setPassword(v);
  const handlePasswordConfirmationChange = (v) => setPasswordConfirmation(v);

  const handlePasswordComplexityChange = (v) => setComplexityValidity(v);

  const handleSignUp = () => {
    dispatch(signup(email, password, displayName, () => navigation.navigate('SignIn')));
  };

  return (
    <View
      w="100%"
      h="100%"
      style={{
        marginTop: 10,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
      }}
    >
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={email}
        mode="outlined"
        activeOutlineColor={emailValid ? theme.colors.primary : theme.colors.error}
        label="Email address"
        placeholder="Enter your email address"
        onChangeText={handleEmailChange}
        style={{ marginBottom: 10, width: '80%' }}
      />
      <TextInput
        autoCorrect={false}
        autoCapitalize="none"
        value={displayName}
        maxLength={20}
        mode="outlined"
        label="Display name"
        placeholder="Enter your name"
        onChangeText={handleDisplayNameChange}
        style={{ marginBottom: 10, width: '80%' }}
      />
      <PasswordInput
        value={password}
        label="Password"
        mode="outlined"
        placeholder="Enter password"
        onChangeText={handlePasswordChange}
        style={{ marginBottom: 10, width: '80%' }}
      />
      <PasswordPolicyChecker
        password={password}
        onChange={handlePasswordComplexityChange}
        style={{ marginBottom: 10, width: '80%' }}
      />
      <PasswordInput
        value={passwordConfirmation}
        label="Confirm Password"
        mode="outlined"
        placeholder="Confirm your password"
        onChangeText={handlePasswordConfirmationChange}
        style={{ marginBottom: 10, width: '80%' }}
      />
      <Button
        mode="contained"
        onPress={handleSignUp}
        disabled={
          !complexityValid ||
          password !== passwordConfirmation ||
          displayName === '' ||
          email === '' ||
          !emailValid
        }
      >
        SIGN UP
      </Button>
    </View>
  );
};

export default SignUp;
