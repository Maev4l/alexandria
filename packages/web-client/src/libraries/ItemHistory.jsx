import { Text } from 'react-native-paper';
import { View } from 'react-native';
import { useEffect } from 'react';
import moment from 'moment';
import { RefreshControl } from 'react-native-web-refresh-control';

import { ACTION_TYPES, useDispatch, useSelector } from '../store';
import { fetchItemHistory } from './operations';
import { Timeline, Alert } from '../components';
import { ITEM_EVENT_TYPE } from '../domain';

export const ItemHistoryHeader = ({ route }) => {
  const {
    params: {
      item: { title, libraryName },
    },
  } = route;

  return (
    <View style={{ padding: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: '18px' }} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      <Text numberOfLines={1} ellipsizeMode="tail">
        {libraryName}
      </Text>
    </View>
  );
};

const ItemHistory = ({ route }) => {
  const {
    params: { item },
  } = route;
  const dispatch = useDispatch();
  const { events, nextToken, refreshing, lastAction } = useSelector((state) => {
    const { itemHistory } = state;
    return {
      nextToken: itemHistory.nextToken,
      refreshing: state.refreshing,
      lastAction: state.lastAction,
      events: itemHistory.events.map((e) => {
        const { date, type, event } = e;
        const time = `${moment(date).format('ddd YYYY-MMM-DD')}`;
        return {
          time,
          title: `${type}`,
          description: `${event} ${type === ITEM_EVENT_TYPE.LENT ? 'lent item' : 'returned item'} at ${moment(date).format('HH:mm')}`,
        };
      }),
    };
  });

  useEffect(() => {
    dispatch(fetchItemHistory(item, nextToken, true));
  }, []);

  const handleEndReached = () => {
    if (nextToken) {
      dispatch(fetchItemHistory(item, nextToken));
    }
  };

  const handleRefresh = () => dispatch(fetchItemHistory(item, '', true));

  return (
    <View style={{ flex: 1, padding: 10 }}>
      {(lastAction === ACTION_TYPES.FETCH_ITEM_HISTORY_SUCCESS ||
        lastAction === ACTION_TYPES.REFRESH_ITEM_HISTORY_SUCCESS) &&
      events.length === 0 ? (
        <Alert variant="primary" style={{ marginTop: 20 }} text="This item has no history." />
      ) : null}
      <Timeline
        data={events}
        options={{
          refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />,
          // renderFooter: this.renderFooter,
          onEndReached: handleEndReached,
        }}
      />
    </View>
  );
};

export default ItemHistory;
