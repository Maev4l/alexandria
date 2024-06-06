import { Text, useTheme, IconButton, Icon, Divider } from 'react-native-paper';
import { View, Image, Pressable } from 'react-native';

import { useAuth } from '../store';

const BookItem = ({
  book,
  style,
  onPress,
  onPressActions,
  showDivider,
  showLibrary,
  showOrder,
}) => {
  const theme = useTheme();
  const { userId } = useAuth();
  const { title, authors, /* isbn, */ picture, ownerId, libraryName, lentTo, order } = book;
  return (
    <>
      <Pressable onPress={onPress}>
        <View
          style={{
            flex: 1,
            /* borderWidth: 2,
            borderRadius: '5px',
            borderColor: theme.colors.secondary,
            padding: 5, */
            minHeight: '100px',
            ...style,
          }}
        >
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {picture ? (
                <View
                  style={{
                    width: 60,
                    height: 90,
                  }}
                >
                  <Image
                    source={{
                      uri: `data:image/jpeg;base64,${picture}`,
                    }}
                    style={{
                      resizeMode: 'stretch',
                      flex: 1,
                      width: '100%',
                      height: '100%',
                      borderRadius: '5%',
                    }}
                  />
                </View>
              ) : (
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 60,
                    height: 90,
                    borderWidth: '1px',
                    borderRadius: '5%',
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text variant="titleLarge">?</Text>
                </View>
              )}
              <View style={{ flex: 1, height: 90, paddingLeft: 5 }}>
                <View style={{ flexShrink: 1 }}>
                  <Text variant="labelLarge" style={{ flexWrap: 'wrap' }}>
                    {title} {showOrder && order ? `(${order})` : null}
                  </Text>
                  <Text style={{ fontStyle: 'italic' }}>{authors.join(', ')}</Text>
                </View>
                {/* <Text>ISBN: {isbn}</Text> */}
              </View>
            </View>
            <View style={{ alignItems: 'center' }}>
              {ownerId === userId && (
                <IconButton
                  icon="dots-vertical"
                  animated
                  size={16}
                  mode="contained"
                  onPress={onPressActions}
                  style={{ marginTop: 0 }}
                />
              )}
              {ownerId === userId && lentTo && <Icon source="arrow-right-top" size={20} />}
            </View>
          </View>
          {showLibrary && (
            <View style={{ alignItems: 'flex-start', paddingTop: 5, paddingBottom: 5 }}>
              <Text
                style={{
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.onPrimaryContainer,
                  borderRadius: '5px',
                  padding: '3px',
                  color: theme.colors.onPrimary,
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {libraryName}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
      {showDivider ? <Divider style={{ marginBottom: 10 }} horizontalInset /> : null}
    </>
  );
};

export default BookItem;
