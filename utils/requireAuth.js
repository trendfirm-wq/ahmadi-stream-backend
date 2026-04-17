import { Alert } from 'react-native';
import { router } from 'expo-router';

export const requireAuth = (userToken, message = 'Please login to continue.') => {
  if (userToken) return true;

  Alert.alert(
    'Login Required',
    message,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Login',
        onPress: () => router.push('/login')
      }
    ]
  );

  return false;
};