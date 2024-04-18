import { View, Pressable } from 'react-native';
import { Text, useTheme, IconButton, Icon, Chip } from 'react-native-paper';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useNavigation } from '@react-navigation/native';

import { deleteLibrary } from './operations';
import { useDispatch } from '../store';

const LibraryItemList = ({ library, style, onPressActions, onPress }) => {
  const theme = useTheme();

  const { name, description, totalItems, sharedFrom, sharedTo } = library;

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
          minHeight: sharedFrom || (sharedTo && sharedTo.length > 0) ? '150px' : '100px',
          ...style,
        }}
      >
        <View
          style={{
            paddingRight: 5,
            flexDirection: 'row',
            flex: 1,
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text variant="titleMedium" numberOfLines={1} ellipsizeMode="tail">
              {name}
            </Text>
            <Text variant="bodyMedium" style={{ flexWrap: 'wrap' }}>
              {description}
            </Text>
          </View>
          {!sharedFrom && (
            <IconButton
              icon="dots-vertical"
              animated
              size={16}
              mode="contained"
              onPress={onPressActions}
              style={{ marginTop: 0 }}
            />
          )}
        </View>
        <View>
          {sharedTo && sharedTo.length > 0 && (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 5,
              }}
            >
              {sharedTo.map((s) => (
                <Chip key={s} elevated icon="share">
                  {s}
                </Chip>
              ))}
            </View>
          )}
          {sharedFrom && (
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Chip selected elevated showSelectedOverlay icon="share-variant">
                {sharedFrom}
              </Chip>
            </View>
          )}
          <Text variant="bodySmall" style={{ fontStyle: 'italic', marginTop: 5 }}>
            Total items: {totalItems}
          </Text>
        </View>
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
    const { sharedTo } = library;

    showActionSheetWithOptions(
      {
        options: [
          'Update',
          sharedTo && sharedTo.length > 0 ? 'Unshare' : 'Share',
          'Delete',
          'Cancel',
        ],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
        showSeparators: true,
        tintIcons: true,
        icons: [
          <Icon color={theme.colors.onBackground} source="pencil-outline" size={20} />,
          sharedTo && sharedTo.length > 0 ? (
            <Icon color={theme.colors.onBackground} source="share-off-outline" size={20} />
          ) : (
            <Icon color={theme.colors.onBackground} source="share-outline" size={20} />
          ),
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
            if (sharedTo && sharedTo.length > 0) {
              navigation.navigate('UnshareLibrary', {
                library,
              });
            } else {
              navigation.navigate('ShareLibrary', {
                library,
              });
            }
            break;
          }
          case 2: {
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
