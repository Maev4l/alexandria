import {
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  fetchAuthSession,
  updatePassword,
} from 'aws-amplify/auth';

import actions from './actions';

export const getToken = () => async (dispatch) => {
  dispatch(actions.fetchingToken());

  try {
    const { tokens } = await fetchAuthSession();
    if (tokens) {
      const { idToken } = tokens;
      dispatch(actions.fetchTokenSuccess(idToken));
    } else {
      dispatch(actions.fetchTokenSuccess(null));
    }
  } catch (e) {
    dispatch(actions.fetchTokenError(e));
  }
};

export const signout = () => async (dispatch) => {
  dispatch(actions.signingOut());
  try {
    await cognitoSignOut();
    dispatch(actions.signOutSuccess());
  } catch (e) {
    dispatch(actions.signOutError());
  }
};

export const signin = (username, password) => async (dispatch) => {
  dispatch(actions.signingIn());

  try {
    const { isSignedIn } = await cognitoSignIn({ username, password });
    if (isSignedIn) {
      const result = await fetchAuthSession();
      const {
        tokens: { idToken },
      } = result;
      dispatch(actions.signInSuccess(idToken));
    } else {
      dispatch(actions.signInError(new Error('Sign up not finalized.')));
    }
  } catch (e) {
    if (e.name !== 'UserAlreadyAuthenticatedException') {
      dispatch(actions.signInError(e));
    }
  }
};

export const changePassword = (oldPassword, newPassword) => async (dispatch) => {
  dispatch(actions.changingPassword());
  try {
    await updatePassword({ oldPassword, newPassword });
    dispatch(actions.changePasswordSuccess());
  } catch (e) {
    dispatch(actions.changePasswordError(e));
  }
};

export const signup = (username, password, displayName, callback) => async (dispatch) => {
  dispatch(actions.signingUp());
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
    /*
    console.log(
      `isSignUpComplete: ${isSignUpComplete} - userId: ${userId} - nextStep: ${JSON.stringify(nextStep)}`,
    );
    */
    dispatch(actions.signUpSuccess());
    if (callback) {
      callback();
    }
  } catch (e) {
    dispatch(actions.signUpError(e));
  }
};
