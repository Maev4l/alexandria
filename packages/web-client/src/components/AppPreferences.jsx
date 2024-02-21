/* eslint-disable global-require */
import { createContext, useMemo, useEffect, useContext } from 'react';
import {
  PaperProvider,
  adaptNavigationTheme,
  MD3DarkTheme,
  MD3LightTheme,
} from 'react-native-paper';
import {
  NavigationContainer,
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useSelector, useDispatch, ACTION_TYPES } from '../store';

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  reactNavigationDark: NavigationDarkTheme,
});

const CombinedDefaultTheme = {
  ...MD3LightTheme,
  ...LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...LightTheme.colors,
  },
};
// eslint-disable-next-line no-unused-vars
const CombinedDarkTheme = {
  ...MD3DarkTheme,
  ...DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...DarkTheme.colors,
  },
};

const PreferencesContext = createContext();

const readAppPreferences = () => async (dispatch) => {
  dispatch({ type: ACTION_TYPES.READING_APP_PREFERENCES });
  try {
    const value = await AsyncStorage.getItem('preferences');
    dispatch({ type: ACTION_TYPES.READ_APP_PREFERENCES_SUCCESS, payload: JSON.parse(value) });
  } catch (e) {
    dispatch({ type: ACTION_TYPES.READ_APP_PREFERENCES_ERROR, payload: e });
  }
};

const writeAppPreferences = (preferences) => async (dispatch) => {
  dispatch({ type: ACTION_TYPES.WRITING_APP_PREFERENCES });
  try {
    const jsonValue = JSON.stringify(preferences);
    await AsyncStorage.setItem('preferences', jsonValue);
    dispatch({ type: ACTION_TYPES.WRITE_APP_PREFERENCES_SUCCESS, payload: preferences });
  } catch (e) {
    dispatch({ type: ACTION_TYPES.WRITE_APP_PREFERENCES_ERROR, payload: e });
  }
};

export const AppPreferencesProvider = ({ children }) => {
  const preferences = useSelector((state) => state.preferences);
  const dispatch = useDispatch();

  const readPrefs = async () => dispatch(readAppPreferences());

  useEffect(() => readPrefs, []);

  const { darkMode } = preferences;

  const setDarkMode = (val) => {
    const newPrefs = { ...preferences };
    newPrefs.darkMode = val;
    dispatch(writeAppPreferences(newPrefs));
  };

  const v = useMemo(() => ({ setDarkMode, darkMode }), [preferences, setDarkMode]);

  const theme = darkMode ? CombinedDarkTheme : CombinedDefaultTheme;

  return (
    <PreferencesContext.Provider value={v}>
      <PaperProvider theme={theme}>
        <style type="text/css">{`
  @font-face {
    font-family: 'MaterialCommunityIcons';
    src: url(${require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}) format('truetype');
  }
`}</style>
        <NavigationContainer theme={theme}>{children}</NavigationContainer>
      </PaperProvider>
    </PreferencesContext.Provider>
  );
};

export const useAppPreferences = () => useContext(PreferencesContext);
