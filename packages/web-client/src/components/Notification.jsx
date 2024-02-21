import { Snackbar, Icon, Portal, Text, withTheme } from "react-native-paper";
import { View } from "react-native";

import { useSelector, useDispatch } from "../store";
import { dismissNotification } from "./actions";

const computeStyles = (notification, theme) => ({
  container: {
    backgroundColor:
      notification.severity === "error"
        ? theme.colors.errorContainer
        : theme.colors.primaryContainer,
    borderWidth: 1,
    borderColor:
      notification.severity === "error"
        ? theme.colors.error
        : theme.colors.primary,
  },

  text: {
    color:
      notification.severity === "error"
        ? theme.colors.error
        : theme.colors.primary,
  },
});

const Notification = ({ theme }) => {
  const n = useSelector((state) => {
    const { notification } = state;
    return notification;
  });

  const dispatch = useDispatch();

  const handleClose = () => {
    dispatch(dismissNotification());
  };

  const styles = computeStyles(n, theme);

  return (
    <Portal>
      <Snackbar
        visible={n.text}
        duration={5000}
        onDismiss={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        style={styles.container}
      >
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Icon
            source={
              n.severity === "error" ? "alert-circle-outline" : "check-bold"
            }
            color={styles.text.color}
            size={30}
          />
          <Text style={[{ paddingLeft: 10 }, styles.text]} adjustsFontSizeToFit>
            {n.text}
          </Text>
        </View>
      </Snackbar>
    </Portal>
  );
};

export const NotificationBar = withTheme(Notification);
