import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/constants';

const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let publicSocket = null;
let adminSocket = null;

const getPublicSocket = () => {
  if (!publicSocket) {
    publicSocket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    publicSocket.emit('join', 'public-results');
  }
  return publicSocket;
};

const getAdminSocket = (token) => {
  if (!token) return null;
  if (!adminSocket || adminSocket.auth?.token !== token) {
    if (adminSocket) adminSocket.disconnect();
    adminSocket = io(`${SOCKET_URL}/admin`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token },
    });
  }
  return adminSocket;
};

export const subscribeToPublicResults = (handler) => {
  const socket = getPublicSocket();
  const onUpdate = () => handler();
  socket.on('results:updated', onUpdate);
  socket.on('runoff:updated', onUpdate);
  socket.on('connect', onUpdate);
  return () => {
    socket.off('results:updated', onUpdate);
    socket.off('runoff:updated', onUpdate);
    socket.off('connect', onUpdate);
  };
};

export const subscribeToAdminVotes = (token, handler) => {
  const socket = getAdminSocket(token);
  if (!socket) return () => {};

  const onPending = () => handler('vote:pending:new');
  const onStatus = () => handler('vote:status:changed');
  const onResults = () => handler('results:updated');
  const onRunoff = () => handler('runoff:updated');

  socket.on('vote:pending:new', onPending);
  socket.on('vote:status:changed', onStatus);
  socket.on('results:updated', onResults);
  socket.on('runoff:updated', onRunoff);
  socket.on('connect', onResults);

  return () => {
    socket.off('vote:pending:new', onPending);
    socket.off('vote:status:changed', onStatus);
    socket.off('results:updated', onResults);
    socket.off('runoff:updated', onRunoff);
    socket.off('connect', onResults);
  };
};

export const disconnectSockets = () => {
  if (publicSocket) {
    publicSocket.disconnect();
    publicSocket = null;
  }
  if (adminSocket) {
    adminSocket.disconnect();
    adminSocket = null;
  }
};
