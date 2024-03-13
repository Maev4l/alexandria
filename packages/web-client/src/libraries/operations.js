import {
  fetchLibrariesSuccess,
  createLibrarySuccess,
  updateLibrarySuccess,
  deleteLibrarySuccess,
  fetchLibraryItemsSuccess,
  createBookSuccess,
} from './actions';

import { api } from '../api';
import { appError, appWaiting } from '../store';

export const fetchLibraryItems =
  (libraryId, nextToken = '') =>
  async (dispatch) => {
    dispatch(appWaiting());
    try {
      const data = await api.get(`/v1/libraries/${libraryId}/items?nextToken=${nextToken}`);
      dispatch(fetchLibraryItemsSuccess(data));
    } catch (e) {
      dispatch(appError(e));
    }
  };

export const fetchLibraries = () => async (dispatch) => {
  dispatch(appWaiting());

  try {
    const data = await api.get('/v1/libraries');
    dispatch(fetchLibrariesSuccess(data));
  } catch (e) {
    dispatch(appError(e));
  }
};

export const createLibrary = (library, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.post('/v1/libraries', library);
    const data = await api.get('/v1/libraries');
    dispatch(createLibrarySuccess(data));
    callback();
  } catch (e) {
    dispatch(appError(e));
  }
};

export const updateLibrary = (library, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.put(`/v1/libraries/${library.id}`, library);
    const data = await api.get('/v1/libraries');
    dispatch(updateLibrarySuccess(data));
    callback();
  } catch (e) {
    dispatch(appError(e));
  }
};

export const deleteLibrary = (libraryId) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.del(`/v1/libraries/${libraryId}`);
    const data = await api.get('/v1/libraries');
    dispatch(deleteLibrarySuccess(data));
  } catch (e) {
    dispatch(appError(e));
  }
};

export const createBook = (item, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    const data = await api.post(`/v1/libraries/${item.libraryId}/books`, item);

    dispatch(createBookSuccess(data));
    callback();
  } catch (e) {
    dispatch(appError(e));
  }
};
