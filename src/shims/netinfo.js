/**
 * Stub for @react-native-community/netinfo
 * pusher-js requires this module for network detection in React Native.
 * This shim provides a minimal implementation that always reports online.
 */

let listeners = [];

const netInfo = {
  fetch: () =>
    Promise.resolve({
      type: 'wifi',
      isConnected: true,
      isInternetReachable: true,
    }),
  addEventListener: (type, callback) => {
    listeners.push({ type, callback });
    return {
      remove: () => {
        listeners = listeners.filter(
          (l) => l !== listeners.find((x) => x.callback === callback)
        );
      },
    };
  },
  removeEventListener: (type, callback) => {
    listeners = listeners.filter(
      (l) => !(l.type === type && l.callback === callback)
    );
  },
};

export default netInfo;
