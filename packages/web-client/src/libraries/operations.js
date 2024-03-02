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
