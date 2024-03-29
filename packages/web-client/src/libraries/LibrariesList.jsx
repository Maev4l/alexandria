import { View, Pressable } from 'react-native';
import { Text, useTheme, IconButton, Icon } from 'react-native-paper';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';

import { deleteLibrary } from './operations';
import { useDispatch } from '../store';

const LibraryItemList = ({ library, style, onPressActions, onPress }) => {
  const theme = useTheme();

  const { name, description, totalItems } = library;

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flex: 1,
          borderWidth: 2,
          borderRadius: '5px',
          borderColor: theme.colors.secondary,
          padding: 5,
          justifyContent: 'space-between',
          flexDirection: 'row',
          minHeight: '100px',
          ...style,
        }}
      >
        <View style={{ paddingRight: 5, flex: 1, justifyContent: 'space-between' }}>
          <View>
            <Text variant="titleMedium" numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Text>
            <Text variant="bodyMedium" style={{ flexWrap: 'wrap' }}>
              {description}
            </Text>
          </View>
          <Text variant="bodySmall" style={{ fontStyle: 'italic' }}>
            Total items: {totalItems}
          </Text>
        </View>
        <IconButton
          icon="dots-vertical"
          animated
          size={16}
          mode="contained"
          onPress={onPressActions}
          style={{ marginTop: 0 }}
        />
      </View>
    </Pressable>
  );
};

const LibrariesList = ({ libraries }) => {
  const { showActionSheetWithOptions } = useActionSheet();
  const navigation = useNavigation();
  const theme = useTheme();
  const dispatch = useDispatch();

  const handlePress = (library) => {
    navigation.navigate('LibraryItems', { library });
  };

  const handlePressActions = (library) => {
    showActionSheetWithOptions(
      {
        options: ['Update', 'Delete', 'Cancel'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
        showSeparators: true,
        tintIcons: true,
        icons: [
          <Icon color={theme.colors.onBackground} source="pencil" size={20} />,
          <Icon color={theme.colors.error} source="trash-can-outline" size={20} />,
          <Icon color={theme.colors.onBackground} source="close" size={20} />,
        ],
        destructiveColor: theme.colors.error,
        containerStyle: { backgroundColor: theme.colors.background },
        tintColor: theme.colors.onBackground,
      },
      (index) => {
        switch (index) {
          case 0: {
            navigation.navigate('UpdateLibrary', {
              libraryId: library.id,
              libraryName: library.name,
            });
            break;
          }
          case 1: {
            dispatch(deleteLibrary(library.id));
            break;
          }

          default: {
            /* empty */
          }
        }
      },
    );
  };

  return (
    <>
      {libraries.map((l) => (
        <LibraryItemList
          key={l.id}
          library={l}
          style={{ marginBottom: 10 }}
          onPressActions={() => handlePressActions(l)}
          onPress={() => handlePress(l)}
        />
      ))}
    </>
  );
};

export default LibrariesList;
