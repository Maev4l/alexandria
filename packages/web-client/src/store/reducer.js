import ACTION_TYPES from './types';

export const INITIAL_STATE = {
  loading: false,
  preferences: {
    darkMode: false,
  },
  authn: {
    state: 'FETCHING_TOKEN', // LOGGED_IN, LOGGED_OUT
    token: null,
  },
  notification: {
    text: null,
    severity: '', // error, success
  },
  resolvedBooks: [],
};

export const reducer = (state, action) => {
  const { type, payload } = action;

  switch (type) {
    case ACTION_TYPES.SIGN_IN_SUCCESS: {
      const authn = {
        state: 'LOGGED_IN',
        token: payload,
      };
      return { ...state, loading: false, authn };
    }

    case ACTION_TYPES.FETCH_TOKEN_SUCCESS: {
      const token = payload;
      const authn = {
        state: '',
        token: null,
      };

      if (token) {
        authn.state = 'LOGGED_IN';
        authn.token = token;
      } else {
        authn.state = 'LOGGED_OUT';
      }
      return { ...state, loading: false, authn };
    }

    case ACTION_TYPES.DETECT_BOOK_SUCCESS: {
      const { detectedBooks } = payload;
      return { ...state, loading: false, resolvedBooks: detectedBooks };
    }

    case ACTION_TYPES.DISMISS_NOTIFICATION: {
      return {
        ...state,
        loading: false,
        notification: { text: null, severity: '' },
      };
    }

    case ACTION_TYPES.SIGN_OUT_SUCCESS: {
      return {
        ...state,
        loading: false,
        authn: {
          state: 'LOGGED_OUT',
          token: null,
        },
        weekCursor: null,
        schedules: [],
      };
    }

    case ACTION_TYPES.READ_APP_PREFERENCES_SUCCESS: {
      if (payload !== null) {
        return { ...state, preferences: payload, loading: false };
      }
      return { ...state, loading: false };
    }

    case ACTION_TYPES.WRITE_APP_PREFERENCES_SUCCESS: {
      return { ...state, preferences: payload, loading: false };
    }

    case ACTION_TYPES.SIGNUP_SUCCESS: {
      return {
        ...state,
        loading: false,
        notification: {
          text: 'Your request is being processed.\nAn administrator will finalize your registration.',
          severity: 'success',
        },
      };
    }

    case ACTION_TYPES.DETECTING_BOOK:
    case ACTION_TYPES.SIGNING_UP:
    case ACTION_TYPES.WRITING_APP_PREFERENCES:
    case ACTION_TYPES.READING_APP_PREFERENCES:
    case ACTION_TYPES.SIGNING_OUT:
    case ACTION_TYPES.FETCHING_TOKEN:
    case ACTION_TYPES.SIGNING_IN: {
      return { ...state, loading: true };
    }

    case ACTION_TYPES.DETECT_BOOK_ERROR:
    case ACTION_TYPES.SIGNUP_ERROR:
    case ACTION_TYPES.WRITE_APP_PREFERENCES_ERROR:
    case ACTION_TYPES.READ_APP_PREFERENCES_ERROR:
    case ACTION_TYPES.SIGN_OUT_ERROR:
    case ACTION_TYPES.FETCH_TOKEN_ERROR:
    case ACTION_TYPES.SIGN_IN_ERROR: {
      const error = payload;
      return {
        ...state,
        loading: false,
        notification: { text: error.message, severity: 'error' },
      };
    }

    default:
      return state;
  }
};
