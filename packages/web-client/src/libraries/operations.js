import actions from './actions';

import { api } from '../api';

export const fetchLibraries = () => async (dispatch) => {
  dispatch(actions.fetchingLibraries());

  try {
    const data = await api.get('/v1/libraries');
    dispatch(actions.fetchLibrariesSuccess(data));
  } catch (e) {
    dispatch(actions.fetchLibrariesError(e));
  }
};

export const createLibrary = (library, callback) => async (dispatch) => {
  dispatch(actions.creatingLibrary());
  try {
    await api.post('/v1/libraries', library);
    const data = await api.get('/v1/libraries');
    dispatch(actions.createLibrarySuccess(data));
    callback();
  } catch (e) {
    dispatch(actions.createLibraryError(e));
  }
};
