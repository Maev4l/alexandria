import { View, ScrollView } from 'react-native';
import { RefreshControl } from 'react-native-web-refresh-control';
import { useEffect, useCallback } from 'react';
import { Chip } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { useDispatch, useSelector, resetLibraryItems, ACTION_TYPES } from '../store';
import { fetchLibraries } from './operations';
import LibrariesList from './LibrariesList';
import { Alert } from '../components';

const LibrariesScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { libraries, lastAction, refreshing } = useSelector((state) => ({
    libraries: state.libraries,
    lastAction: state.lastAction,
    refreshing: state.refreshing,
  }));

  useEffect(() => {
    dispatch(fetchLibraries());
    dispatch(resetLibraryItems());
  }, []);

  useFocusEffect(
    useCallback(() => {
      dispatch(resetLibraryItems());
    }, []),
  );

  const handleAdd = () => navigation.navigate('AddLibrary');

  const handleRefresh = () => dispatch(fetchLibraries(true));

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
      {(lastAction === ACTION_TYPES.FETCH_LIBRARIES_SUCCESS ||
        lastAction === ACTION_TYPES.DELETE_LIBRARY_SUCCESS ||
        lastAction === ACTION_TYPES.DISMISS_NOTIFICATION) &&
      libraries.length === 0 ? (
        <Alert variant="primary" style={{ marginTop: 20 }} text="You have no libraries." />
      ) : null}
      <ScrollView
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} />}
      >
        <LibrariesList libraries={libraries} />
      </ScrollView>
    </View>
  );
};

export default LibrariesScreen;
