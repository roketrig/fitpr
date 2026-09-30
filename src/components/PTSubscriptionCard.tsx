import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { ProductSubscriptionAndroid, useIAP } from 'expo-iap';
import { fetchMySubscription, fetchMyStudents } from '../lib/coaching';
import { PT_SUBSCRIPTION_SKU, verifyPurchaseOnServer } from '../lib/iap';
import { useT } from '../i18n/useT';
import { Colors, useColors } from '../theme';
import { PtSubscription } from '../types';

export function PTSubscriptionCard() {
  const { t, dateLocale } = useT();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [subscription, setSubscription] = useState<PtSubscription | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciled, setReconciled] = useState(false);

  const {
    connected,
    subscriptions,
    availablePurchases,
    fetchProducts,
    getAvailablePurchases,
    requestPurchase,
    finishTransaction,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      setPurchasing(true);
      setError(null);
      try {
        const platform = purchase.store === 'apple' ? 'ios' : 'android';
        const environment = purchase.store === 'apple' ? (purchase as { environmentIOS?: string | null }).environmentIOS : null;
        const result = await verifyPurchaseOnServer({
          platform,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken ?? '',
          transactionId: purchase.transactionId,
          environment,
        });
        if (!result.success) {
          setError(result.error ?? t('subscription.verifyFailed'));
          return;
        }
        await finishTransaction({ purchase, isConsumable: false });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPurchasing(false);
      }
    },
    onPurchaseError: (err) => {
      setPurchasing(false);
      setError(err.message);
    },
  });

  async function refresh() {
    const [sub, students] = await Promise.all([fetchMySubscription(), fetchMyStudents()]);
    setSubscription(sub);
    setStudentCount(students.length);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (connected) {
      fetchProducts({ skus: [PT_SUBSCRIPTION_SKU], type: 'subs' });
      getAvailablePurchases();
    }
  }, [connected]);

  // No renewal/cancellation webhook yet, so re-check with the store whenever
  // the card mounts: if the device still holds an active purchase for our
  // SKU but our own record looks stale (expired or not active), re-verify
  // it with the server to pick up a renewal that happened while the app was
  // closed.
  useEffect(() => {
    if (reconciled || loading || !subscription) return;
    const ptPurchase = availablePurchases.find((p) => p.productId === PT_SUBSCRIPTION_SKU);
    if (!ptPurchase) {
      setReconciled(true);
      return;
    }
    const storedStale =
      subscription.status !== 'active' ||
      !subscription.currentPeriodEnd ||
      new Date(subscription.currentPeriodEnd).getTime() < Date.now();
    setReconciled(true);
    if (!storedStale) return;
    const platform = ptPurchase.store === 'apple' ? 'ios' : 'android';
    const environment =
      ptPurchase.store === 'apple' ? (ptPurchase as { environmentIOS?: string | null }).environmentIOS : null;
    verifyPurchaseOnServer({
      platform,
      productId: ptPurchase.productId,
      purchaseToken: ptPurchase.purchaseToken ?? '',
      transactionId: ptPurchase.transactionId,
      environment,
    }).then((result) => {
      if (result.success) refresh();
    });
  }, [availablePurchases, loading, subscription, reconciled]);

  const product = subscriptions.find((s) => s.id === PT_SUBSCRIPTION_SKU);

  async function handleSubscribe() {
    setError(null);
    setPurchasing(true);
    try {
      if (Platform.OS === 'android') {
        const offerToken = (product as ProductSubscriptionAndroid | undefined)?.subscriptionOffers?.[0]
          ?.offerTokenAndroid;
        if (!offerToken) {
          setError(t('subscription.notReady'));
          setPurchasing(false);
          return;
        }
        await requestPurchase({
          type: 'subs',
          request: {
            google: {
              skus: [PT_SUBSCRIPTION_SKU],
              subscriptionOffers: [{ sku: PT_SUBSCRIPTION_SKU, offerToken }],
            },
          },
        });
      } else {
        await requestPurchase({ type: 'subs', request: { apple: { sku: PT_SUBSCRIPTION_SKU } } });
      }
    } catch (e) {
      setPurchasing(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.lime} />
      </View>
    );
  }
  if (!subscription) return null;

  const trialDaysLeft = Math.max(
    0,
    30 - Math.floor((Date.now() - new Date(subscription.trialStartedAt).getTime()) / 86400000)
  );

  return (
    <View style={styles.card}>
      {subscription.status === 'active' ? (
        <>
          <Text style={styles.statusActive}>{t('subscription.active')}</Text>
          {subscription.currentPeriodEnd && (
            <Text style={styles.hint}>
              {t('subscription.renewsOn', {
                date: new Date(subscription.currentPeriodEnd).toLocaleDateString(dateLocale()),
              })}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text style={subscription.status === 'trial' ? styles.statusTrial : styles.statusExpired}>
            {subscription.status === 'trial' ? t('subscription.trial') : t('subscription.expired')}
          </Text>
          <Text style={styles.hint}>
            {t('subscription.studentsUsed', { used: studentCount, limit: subscription.studentLimit })}
          </Text>
          {subscription.status === 'trial' && (
            <Text style={styles.hint}>{t('subscription.daysLeft', { days: trialDaysLeft })}</Text>
          )}
          <Pressable
            style={[styles.subscribeButton, purchasing && styles.disabled]}
            onPress={handleSubscribe}
            disabled={purchasing || !connected}
          >
            {purchasing ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {product ? t('subscription.subscribeFor', { price: product.displayPrice }) : t('subscription.subscribe')}
              </Text>
            )}
          </Pressable>
        </>
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const makeStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  statusActive: { color: colors.lime, fontSize: 15, fontWeight: '800' },
  statusTrial: { color: colors.foreground, fontSize: 15, fontWeight: '800' },
  statusExpired: { color: colors.orange, fontSize: 15, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 12, marginTop: 6, lineHeight: 17 },
  subscribeButton: {
    backgroundColor: colors.lime,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 14,
    alignItems: 'center',
  },
  disabled: { opacity: 0.7 },
  subscribeButtonText: { color: colors.background, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  error: { color: colors.orange, fontSize: 12, fontWeight: '600', marginTop: 10, lineHeight: 17 },
});
