import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message: string;
  cancelText: string;
  confirmText: string;
  onConfirm: () => void | Promise<void>;
}

/** Pide confirmación. En web `Alert.alert` no hace nada, así que se usa el cuadro del navegador. */
export function confirmAction({ title, message, cancelText, confirmText, onConfirm }: ConfirmOptions) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) void onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: () => void onConfirm() },
  ]);
}
