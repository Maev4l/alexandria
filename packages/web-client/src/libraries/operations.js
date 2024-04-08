import {
  fetchLibrariesSuccess,
  createLibrarySuccess,
  updateLibrarySuccess,
  deleteLibrarySuccess,
  fetchLibraryItemsSuccess,
  createBookSuccess,
  refreshLibraryItemsSuccess,
  deleteLibraryItemSuccess,
  updateBookSuccess,
  detectBookSuccess,
  shareLibrarySuccess,
} from './actions';

import { api } from '../api';
import { appError, appWaiting, appRefreshing } from '../store';

export const fetchLibraryItems =
  (libraryId, nextToken, refresh = false) =>
  async (dispatch) => {
    dispatch(refresh ? appRefreshing() : appWaiting());
    try {
      let url = `/v1/libraries/${libraryId}/items`;
      if (nextToken) {
        url += `?nextToken=${nextToken}`;
      }
      const data = await api.get(url);
      dispatch(refresh ? refreshLibraryItemsSuccess(data) : fetchLibraryItemsSuccess(data));
    } catch (e) {
      dispatch(appError(e));
    }
  };

export const fetchLibraries =
  (refresh = false) =>
  async (dispatch) => {
    dispatch(refresh ? appRefreshing() : appWaiting());

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

export const shareLibrary = (libraryId, userName) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.post(`/v1/libraries/${libraryId}/share`, { userName });
    const data = await api.get('/v1/libraries');
    dispatch(shareLibrarySuccess(data));
  } catch (e) {
    dispatch(appError(e));
  }
};

export const deleteLibraryItem = (libraryId, itemId) => async (dispatch) => {
  dispatch(appRefreshing());
  try {
    await api.del(`/v1/libraries/${libraryId}/items/${itemId}`);
    const data = await api.get(`/v1/libraries/${libraryId}/items`);
    dispatch(deleteLibraryItemSuccess(data));
  } catch (e) {
    dispatch(appError(e));
  }
};

export const createBook = (item, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    await api.post(`/v1/libraries/${item.libraryId}/books`, item);
    const data = await api.get(`/v1/libraries/${item.libraryId}/items`);
    dispatch(createBookSuccess(data));
    callback();
  } catch (e) {
    dispatch(appError(e));
  }
};

export const updateBook = (item, callback) => async (dispatch) => {
  dispatch(appWaiting());
  try {
    // no need to send back the picture to the server
    const { picture, ...rest } = item;

    await api.put(`/v1/libraries/${item.libraryId}/books/${item.id}`, {
      ...rest,
      pictureUrl: rest.pictureUrl === '' ? null : rest.pictureUrl,
    });
    const data = await api.get(`/v1/libraries/${item.libraryId}/items`);
    dispatch(updateBookSuccess(data));
    callback();
  } catch (e) {
    dispatch(appError(e));
  }
};

export const detectBook = (code) => async (dispatch) => {
  dispatch(appWaiting());

  try {
    const data = await api.post('/v1/detections', { type: 0, code });
    dispatch(detectBookSuccess(data));
  } catch (e) {
    dispatch(appError(e));
  }
};
