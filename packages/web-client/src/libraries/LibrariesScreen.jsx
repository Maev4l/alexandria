import { View } from 'react-native';
import { useEffect } from 'react';

import { useDispatch, useSelector } from '../store';
import { fetchLibraries } from './operations';
import LibrariesList from './LibrariesList';
import { Alert } from '../components';

const LibrariesScreen = () => {
  const dispatch = useDispatch();
  const { libraries, loading } = useSelector((state) => ({
    libraries: state.libraries,
    loading: state.loading,
  }));

  useEffect(() => {
    dispatch(fetchLibraries());
  }, []);

  return (
    <View style={{ flex: 1, padding: 10 }}>
      {!loading && libraries.length === 0 ? (
        <Alert variant="primary" style={{ marginTop: 20 }} text="You have no libraries." />
      ) : null}
      <LibrariesList libraries={libraries} />
    </View>
  );
};

export default LibrariesScreen;
