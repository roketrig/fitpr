import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { getSignedImageUrl } from '../lib/media';
import { Colors, useColors } from '../theme';

// food-photos is a private bucket, so the displayed URL is a short-lived
// signed one resolved on mount rather than something stored with the entry.
export function FoodPhotoThumb({ path, size = 40 }: { path: string; size?: number }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedImageUrl('food-photos', path).then((signed) => {
      if (!cancelled) setUrl(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const box = { width: size, height: size };
  if (!url) return <View style={[styles.thumb, box]} />;
  return <Image source={{ uri: url }} style={[styles.thumb, box]} />;
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  thumb: { borderRadius: 10, backgroundColor: colors.panel },
});
