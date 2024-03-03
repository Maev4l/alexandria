import { View } from 'react-native';
import { useEffect } from 'react';
import { Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

import { useDispatch, useSelector } from '../store';
import { fetchLibraries } from './operations';
import LibrariesList from './LibrariesList';
import { Alert } from '../components';

const LibrariesScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { libraries, loading } = useSelector((state) => ({
    libraries: state.libraries,
    loading: state.loading,
  }));

  useEffect(() => {
    dispatch(fetchLibraries());
  }, []);

  const handleAdd = () => navigation.navigate('AddLibrary');

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 10,
          marginBottom: 10,
        }}
      >
        <Chip icon="plus-circle" compact elevated onPress={handleAdd}>
          Add library
        </Chip>
      </View>
      {!loading && libraries.length === 0 ? (
        <Alert variant="primary" style={{ marginTop: 20 }} text="You have no libraries." />
      ) : null}
      <LibrariesList libraries={libraries} />
    </View>
  );
};

export default LibrariesScreen;
