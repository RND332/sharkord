// these values are injected at build time
const DODECAGON_ENV = process.env.DODECAGON_ENV;
const DODECAGON_BUILD_VERSION = process.env.DODECAGON_BUILD_VERSION;
const DODECAGON_BUILD_DATE = process.env.DODECAGON_BUILD_DATE;
const DODECAGON_MEDIASOUP_BIN_NAME = process.env.DODECAGON_MEDIASOUP_BIN_NAME;

const SERVER_VERSION =
  typeof DODECAGON_BUILD_VERSION !== 'undefined'
    ? DODECAGON_BUILD_VERSION
    : '0.0.0-dev';

const BUILD_DATE =
  typeof DODECAGON_BUILD_DATE !== 'undefined' ? DODECAGON_BUILD_DATE : 'dev';

const env =
  typeof DODECAGON_ENV !== 'undefined' ? DODECAGON_ENV : 'development';
const IS_PRODUCTION = env === 'production';
const IS_DEVELOPMENT = !IS_PRODUCTION;
const IS_TEST = process.env.NODE_ENV === 'test';
const IS_DOCKER = process.env.RUNNING_IN_DOCKER === 'true';

if (IS_PRODUCTION) {
  if (!DODECAGON_MEDIASOUP_BIN_NAME) {
    throw new Error('DODECAGON_MEDIASOUP_BIN is not defined');
  }
}

export {
  BUILD_DATE,
  DODECAGON_MEDIASOUP_BIN_NAME,
  IS_DEVELOPMENT,
  IS_DOCKER,
  IS_PRODUCTION,
  IS_TEST,
  SERVER_VERSION
};
