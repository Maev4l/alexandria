import { View, ScrollView } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { useDispatch } from '../store';

import { unshareLibrary } from './operations';

export const UnshareLibraryScreenHeader = ({ route }) => {
  const {
    params: {
      library: { name },
    },
  } = route;

  return (
    <View style={{ padding: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: '18px' }} numberOfLines={1} ellipsizeMode="tail">
        Unshare library
      </Text>
      <Text numberOfLines={1} ellipsizeMode="tail">
        {name}
      </Text>
    </View>
  );
};

const SharedTo = ({ to, onUnshare }) => (
  <Chip
    compact
    elevated
    style={{ marginTop: 10, alignSelf: 'stretch' }}
    onPress={() => onUnshare(to)}
  >
    {to}
  </Chip>
);

const UnshareLibrary = ({ route }) => {
  const {
    params: {
      library: { id: libraryId, sharedTo },
    },
  } = route;

  const dispatch = useDispatch();
  const navigation = useNavigation();

  const handleUnshare = (to) =>
    dispatch(unshareLibrary(libraryId, to, () => navigation.navigate('Libraries')));

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
      <Text style={{ marginBottom: 10 }} variant="titleMedium">
        Unshare with ...
      </Text>
      <ScrollView>
        {sharedTo.map((s) => (
          <SharedTo key={s} to={s} onUnshare={handleUnshare} />
        ))}
      </ScrollView>
    </View>
  );
};

export default UnshareLibrary;
