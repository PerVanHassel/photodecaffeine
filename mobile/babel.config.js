module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 runs its animations on the worklets runtime, and this plugin
    // is what compiles `worklet` functions for it. It has to stay last.
    plugins: ["react-native-worklets/plugin"],
  };
};
