import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  fetchAuthSession,
  updatePassword,
} from 'aws-amplify/auth';

import {
  fetchTokenSuccess,
  signOutSuccess,
  signInSuccess,
  changePasswordSuccess,
  signUpSuccess,
} from './actions';
import { appWaiting, appError } from '../store';

export const getToken = () => async (dispatch) => {
  dispatch(appWaiting());

  try {
    const { tokens } = await fetchAuthSession();
    if (tokens) {
      const { idToken } = tokens;
      dispatch(fetchTokenSuccess(idToken));
    } else {
      dispatch(fetchTokenSuccess(null));
    }
  } catch (e) {
    dispatch(appError(e));
  }
};

export const signout = () => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await cognitoSignOut();
    dispatch(signOutSuccess());
  } catch (e) {
    dispatch(appError(e));
  }
};

export const signin = (username, password) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    const { isSignedIn } = await cognitoSignIn({ username, password });
    if (isSignedIn) {
      const result = await fetchAuthSession();
      const {
        tokens: { idToken },
      } = result;
      dispatch(signInSuccess(idToken));
    } else {
      dispatch(appError(new Error('Sign up not finalized.')));
    }
  } catch (e) {
    if (e.name !== 'UserAlreadyAuthenticatedException') {
      dispatch(appError(e));
    }
  }
};

export const changePassword = (oldPassword, newPassword) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await updatePassword({ oldPassword, newPassword });
    dispatch(changePasswordSuccess());
  } catch (e) {
    dispatch(appError(e));
  }
};

export const signup = (username, password, displayName, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    /* const { isSignUpComplete, userId, nextStep } = */ await cognitoSignUp({
      username,
      password,
      options: {
        userAttributes: {
          'custom:DisplayName': displayName,
        },
      },
    });

    dispatch(signUpSuccess());
    if (callback) {
      callback();
    }
  } catch (e) {
    dispatch(appError(e));
  }
};
