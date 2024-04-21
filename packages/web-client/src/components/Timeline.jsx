import { FlatList, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useState } from 'react';

const defaultCircleSize = 16;
const defaultCircleColor = '#007AFF';
const defaultLineWidth = 2;
const defaultLineColor = '#007AFF';
const defaultTimeTextColor = 'black';
const defaultDotColor = 'white';
const defaultInnerCircle = 'none';

const Timeline = ({
  style,
  listViewStyle,
  listViewContainerStyle,
  rowContainerStyle,
  timeContainerStyle,
  timeStyle,
  eventContainerStyle,
  detailContainerStyle,
  eventDetailStyle,
  descriptionStyle,
  titleStyle,
  separatorStyle,
  circleStyle,
  circleSize = defaultCircleSize,
  circleColor = defaultCircleColor,
  innerCircle = defaultInnerCircle,
  dotSize,
  dotColor = defaultDotColor,
  data,
  onEventPress,
  lineWidth = defaultLineWidth,
  lineColor = defaultLineColor,
}) => {
  const [state, setState] = useState({ x: 0, width: 0 });

  const renderTime = ({ item }) => (
    <View style={{ alignItems: 'flex-end' }}>
      <View style={{ minWidth: 45, ...timeContainerStyle }}>
        <Text
          style={{
            textAlign: 'right',
            color: defaultTimeTextColor,
            overflow: 'hidden',
            ...timeStyle,
          }}
          allowFontScaling
        >
          {item.time}
        </Text>
      </View>
    </View>
  );

  const renderSeparator = () => (
    <View
      style={{
        height: 1,
        backgroundColor: '#aaa',
        marginTop: 10,
        marginBottom: 10,
        ...separatorStyle,
      }}
    />
  );

  const renderDetail = ({ item }) => {
    let description;
    if (typeof item.description === 'string') {
      description = (
        <Text
          style={{
            marginTop: 10,
            ...descriptionStyle,
          }}
          allowFontScaling
        >
          {item.description}
        </Text>
      );
    } else if (typeof item.description === 'object') {
      description = item.description;
    }

    return (
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', ...titleStyle }} allowFontScaling>
          {item.title}
        </Text>
        {description}
      </View>
    );
  };

  const renderEvent = ({ item, index }) => {
    const isLast = data.slice(-1)[0] === item;
    const lc = isLast ? 'rgba(0,0,0,0)' : lineColor;
    const opStyle = {
      borderColor: lc,
      borderLeftWidth: lineWidth,
      borderRightWidth: 0,
      marginLeft: 20,
      paddingLeft: 20,
    };
    return (
      <View
        style={{
          borderLeftWidth: defaultLineWidth,
          flexDirection: 'column',
          flex: 1,
          ...opStyle,
          eventContainerStyle,
        }}
        onLayout={(evt) => {
          if (!state.x && !state.width) {
            const { x, width } = evt.nativeEvent.layout;
            setState({ x, width });
          }
        }}
      >
        <TouchableOpacity
          disabled={onEventPress == null}
          style={detailContainerStyle}
          onPress={() => (onEventPress ? onEventPress(item) : null)}
        >
          <View
            style={{
              borderLeftWidth: defaultLineWidth,
              flexDirection: 'column',
              flex: 1,
              ...eventDetailStyle,
            }}
          >
            {renderDetail(item, index)}
          </View>
          {renderSeparator()}
        </TouchableOpacity>
      </View>
    );
  };

  const renderCircle = ({ item }) => {
    const cStyle = {
      width: state.x ? circleSize : 0,
      height: state.x ? circleSize : 0,
      borderRadius: circleSize / 2,
      backgroundColor: circleColor,
      left: state.x - circleSize / 2 + (lineWidth - 1) / 2,
    };
    let iCircle = null;
    // eslint-disable-next-line default-case
    switch (innerCircle) {
      case 'dot': {
        const dSize = dotSize || circleSize / 2;
        const dStyle = {
          height: dSize,
          width: dSize,
          borderRadius: circleSize / 4,
          backgroundColor: item.dotColor || dotColor,
        };

        iCircle = (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: defaultDotColor,
              ...dStyle,
            }}
          />
        );

        break;
      }
      case 'element':
        iCircle = item.icon;
        break;
    }

    return (
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 10,
          zIndex: 1,
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
          ...cStyle,
          ...circleStyle,
        }}
      >
        {iCircle}
      </View>
    );
  };

  const renderItem = ({ item, index }) => (
    <View style={{ flexDirection: 'row', flex: 1, justifyContent: 'center', ...rowContainerStyle }}>
      {renderTime(item, index)}
      {renderEvent(item, index)}
      {renderCircle(item, index)}
    </View>
  );

  return (
    <View style={{ flex: 1, ...style }}>
      <FlatList
        data={data}
        contentContainerStyle={listViewContainerStyle}
        style={{ flex: 1, ...listViewStyle }}
        renderItem={renderItem}
      />
    </View>
  );
};

export default Timeline;
