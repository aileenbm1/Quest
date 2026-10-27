jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Los íconos cargan una fuente nativa que no existe en Jest.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const Icon = () => null;
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});
