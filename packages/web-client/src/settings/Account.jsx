import { List, Divider, Button } from 'react-native-paper';
import { ScrollView } from 'react-native';

import { useDispatch } from '../store';
import { signout } from '../security';

const SignOut = () => {
  const dispatch = useDispatch();
  return (
    <Button
      mode="contained"
      contentStyle={{ flexDirection: 'row-reverse' }}
      icon="logout-variant"
      style={{ flexGrow: 1, width: '100%' }}
      onPress={() => dispatch(signout())}
    >
      SIGN OUT
    </Button>
  );
};

const Account = ({ navigation }) => (
  <ScrollView>
    <List.Item title={<SignOut />} />
    <Divider />
    <List.Item
      title="Change password"
      left={(props) => <List.Icon {...props} icon="key-change" />}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => navigation.navigate('ChangePassword')}
    />
  </ScrollView>
);

export default Account;
