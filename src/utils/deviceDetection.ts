export const MOBILE_USER_AGENT_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

export const isMobileDevice = () =>
  typeof navigator !== 'undefined' &&
  MOBILE_USER_AGENT_REGEX.test(navigator.userAgent);

export const isAndroid = () =>
  typeof navigator !== 'undefined' && navigator.userAgent.match(/Android/i);

export const isIos = () =>
  typeof navigator !== 'undefined' &&
  navigator.userAgent.match(/iPhone|iPad|iPod/i);

export default isMobileDevice;
