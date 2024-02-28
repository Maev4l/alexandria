import actions from './actions';

import { api } from '../api';

export const detectBook = (code) => async (dispatch) => {
  dispatch(actions.detectingBook());

  try {
    const data = await api.post('/v1/detections', { type: 0, code });
    dispatch(actions.detectBookSuccess(data));
  } catch (e) {
    dispatch(actions.detectBookError(e));
  }
};
