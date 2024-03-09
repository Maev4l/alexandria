import { api } from '../api';
import { appWaiting, appError } from '../store';
import { detectBookSuccess } from './actions';

export const detectBook = (code) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    const data = await api.post('/v1/detections', { type: 0, code });
    dispatch(detectBookSuccess(data));
  } catch (e) {
    dispatch(appError(e));
  }
};
