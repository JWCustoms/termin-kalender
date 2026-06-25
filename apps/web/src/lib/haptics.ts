import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

export async function hapticLight() {
  if (Capacitor.isNativePlatform()) {
    await Haptics.impact({ style: ImpactStyle.Light });
  }
}

export async function hapticMedium() {
  if (Capacitor.isNativePlatform()) {
    await Haptics.impact({ style: ImpactStyle.Medium });
  }
}

export async function hapticSuccess() {
  if (Capacitor.isNativePlatform()) {
    await Haptics.notification({ type: 'SUCCESS' as never });
  }
}
