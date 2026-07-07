module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo']],
    // Required by Stream Chat (Reanimated 4). Must be the LAST plugin.
    plugins: ['react-native-worklets/plugin'],
  };
};
