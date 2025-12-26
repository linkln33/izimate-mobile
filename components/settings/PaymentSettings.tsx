import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from 'expo-router';
import { CURRENCIES, type CurrencyCode } from '@/lib/utils/currency';
import { triggerLight, triggerSuccess } from '@/lib/utils/haptics';
import { pastelDesignSystem } from '@/lib/pastel-design-system';
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem;

interface PaymentMethod {
  id: string;
  type: 'revolut' | 'paypal' | 'bank';
  connected: boolean;
  accountName?: string;
  accountNumber?: string;
  email?: string;
}

export const PaymentSettings: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('GBP');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  
  // Bank account form state
  const [bankForm, setBankForm] = useState({
    accountHolder: '',
    accountNumber: '',
    routingNumber: '',
    iban: '',
    swift: '',
    bankName: '',
  });

  useEffect(() => {
    loadPaymentMethods();
    loadUserCurrency();
  }, []);

  // Reload currency when screen comes into focus (in case it was changed elsewhere)
  useFocusEffect(
    React.useCallback(() => {
      loadUserCurrency();
    }, [])
  );

  const loadUserCurrency = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('currency')
        .eq('id', user.id)
        .single();

      if (userData?.currency) {
        setSelectedCurrency(userData.currency as CurrencyCode);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading user currency:', error);
      }
    }
  };

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load payment methods from user metadata or a separate table
      const { data: userData } = await supabase
        .from('users')
        .select('payment_methods')
        .eq('id', user.id)
        .single();

      if (userData?.payment_methods) {
        setPaymentMethods(userData.payment_methods);
      } else {
        // Initialize with default disconnected methods
        setPaymentMethods([
          { id: 'revolut', type: 'revolut', connected: false },
          { id: 'paypal', type: 'paypal', connected: false },
          { id: 'bank', type: 'bank', connected: false },
        ]);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading payment methods:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencyChange = async (currency: CurrencyCode) => {
    try {
      setSavingCurrency(true);
      triggerLight();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (__DEV__) {
        console.log('💱 Saving currency:', currency, 'for user:', user.id);
      }

      const { data, error } = await supabase
        .from('users')
        .update({ currency })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (__DEV__) {
        console.log('✅ Currency saved successfully:', data?.currency);
      }

      setSelectedCurrency(currency);
      setShowCurrencyModal(false);
      triggerSuccess();
      Alert.alert('Success', `Currency changed to ${CURRENCIES.find(c => c.code === currency)?.name || currency}. All prices will now display in ${currency}.`);
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Error saving currency:', error);
      }
      Alert.alert('Error', 'Failed to update currency preference');
    } finally {
      setSavingCurrency(false);
    }
  };

  const handleConnectRevolut = async () => {
    try {
      Alert.alert(
        'Connect Revolut',
        'This will open Revolut OAuth to connect your account. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              // TODO: Implement Revolut OAuth flow
              // For now, just show a placeholder
              Alert.alert('Coming Soon', 'Revolut integration will be available soon.');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to connect Revolut account');
    }
  };

  const handleConnectPayPal = async () => {
    try {
      Alert.alert(
        'Connect PayPal',
        'This will open PayPal OAuth to connect your account. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              // TODO: Implement PayPal OAuth flow
              // For now, just show a placeholder
              Alert.alert('Coming Soon', 'PayPal integration will be available soon.');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to connect PayPal account');
    }
  };

  const handleConnectBank = () => {
    setShowBankModal(true);
  };

  const handleSaveBankDetails = async () => {
    if (!bankForm.accountHolder || !bankForm.accountNumber || !bankForm.bankName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedMethods = paymentMethods.map(method =>
        method.type === 'bank'
          ? {
              ...method,
              connected: true,
              accountName: bankForm.accountHolder,
              accountNumber: bankForm.accountNumber,
            }
          : method
      );

      // Save to user metadata or payment_methods table
      const { error } = await supabase
        .from('users')
        .update({ payment_methods: updatedMethods })
        .eq('id', user.id);

      if (error) throw error;

      setPaymentMethods(updatedMethods);
      setShowBankModal(false);
      setBankForm({
        accountHolder: '',
        accountNumber: '',
        routingNumber: '',
        iban: '',
        swift: '',
        bankName: '',
      });
      Alert.alert('Success', 'Bank account details saved successfully');
    } catch (error) {
      console.error('Error saving bank details:', error);
      Alert.alert('Error', 'Failed to save bank account details');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (methodId: string) => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;

              const updatedMethods = paymentMethods.map(method =>
                method.id === methodId
                  ? { ...method, connected: false, accountName: undefined, accountNumber: undefined }
                  : method
              );

              const { error } = await supabase
                .from('users')
                .update({ payment_methods: updatedMethods })
                .eq('id', user.id);

              if (error) throw error;

              setPaymentMethods(updatedMethods);
              Alert.alert('Success', 'Payment method disconnected');
            } catch (error) {
              console.error('Error disconnecting payment method:', error);
              Alert.alert('Error', 'Failed to disconnect payment method');
            }
          },
        },
      ]
    );
  };

  const getMethodIcon = (type: string) => {
    switch (type) {
      case 'revolut':
        return 'card-outline';
      case 'paypal':
        return 'logo-paypal';
      case 'bank':
        return 'business-outline';
      default:
        return 'wallet-outline';
    }
  };

  const getMethodColor = (type: string) => {
    switch (type) {
      case 'revolut':
        return '#0075EB';
      case 'paypal':
        return '#0070BA';
      case 'bank':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f25842" />
      </View>
    );
  }

  const currentCurrency = CURRENCIES.find(c => c.code === selectedCurrency);

  return (
    <ScrollView style={styles.container}>
      {/* Currency Selector */}
      <View style={styles.currencyCard}>
        <View style={styles.currencyHeader}>
          <View style={styles.currencyIconContainer}>
            <Ionicons name="cash-outline" size={24} color="#f25842" />
          </View>
          <View style={styles.currencyInfo}>
            <Text style={styles.currencyLabel}>Display Currency</Text>
            <Text style={styles.currencyDescription}>
              Choose the currency for displaying prices throughout the app
            </Text>
          </View>
        </View>
        <Pressable
          style={styles.currencySelector}
          onPress={() => {
            triggerLight();
            setShowCurrencyModal(true);
          }}
        >
          <View style={styles.currencySelectorContent}>
            <Text style={styles.currencyFlag}>{currentCurrency?.flag || '💰'}</Text>
            <View style={styles.currencySelectorText}>
              <Text style={styles.currencySelectorName}>
                {currentCurrency?.name || selectedCurrency}
              </Text>
              <Text style={styles.currencySelectorCode}>{selectedCurrency}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </Pressable>
      </View>

      {/* Revolut */}
      <View style={styles.methodCard}>
        <View style={styles.methodHeader}>
          <View style={[styles.methodIcon, { backgroundColor: getMethodColor('revolut') + '20' }]}>
            <Ionicons name={getMethodIcon('revolut')} size={24} color={getMethodColor('revolut')} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>Revolut</Text>
            <Text style={styles.methodDescription}>{t('payment.revolutDescription')}</Text>
          </View>
        </View>
        {paymentMethods.find(m => m.type === 'revolut')?.connected ? (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.connectedText}>{t('payment.connected')}</Text>
            <Pressable
              style={styles.disconnectButton}
              onPress={() => handleDisconnect('revolut')}
            >
              <Text style={styles.disconnectText}>{t('payment.disconnect')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.connectButton, { backgroundColor: getMethodColor('revolut') }]}
            onPress={handleConnectRevolut}
          >
            <Text style={styles.connectButtonText}>{t('payment.connectRevolut')}</Text>
          </Pressable>
        )}
      </View>

      {/* PayPal */}
      <View style={styles.methodCard}>
        <View style={styles.methodHeader}>
          <View style={[styles.methodIcon, { backgroundColor: getMethodColor('paypal') + '20' }]}>
            <Ionicons name={getMethodIcon('paypal')} size={24} color={getMethodColor('paypal')} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>PayPal</Text>
            <Text style={styles.methodDescription}>{t('payment.paypalDescription')}</Text>
          </View>
        </View>
        {paymentMethods.find(m => m.type === 'paypal')?.connected ? (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.connectedText}>{t('payment.connected')}</Text>
            <Pressable
              style={styles.disconnectButton}
              onPress={() => handleDisconnect('paypal')}
            >
              <Text style={styles.disconnectText}>{t('payment.disconnect')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.connectButton, { backgroundColor: getMethodColor('paypal') }]}
            onPress={handleConnectPayPal}
          >
            <Text style={styles.connectButtonText}>{t('payment.connectPayPal')}</Text>
          </Pressable>
        )}
      </View>

      {/* Bank Account */}
      <View style={styles.methodCard}>
        <View style={styles.methodHeader}>
          <View style={[styles.methodIcon, { backgroundColor: getMethodColor('bank') + '20' }]}>
            <Ionicons name={getMethodIcon('bank')} size={24} color={getMethodColor('bank')} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodName}>{t('payment.connectBank')}</Text>
            <Text style={styles.methodDescription}>{t('payment.bankDescription')}</Text>
          </View>
        </View>
        {paymentMethods.find(m => m.type === 'bank')?.connected ? (
          <View style={styles.connectedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.connectedText}>{t('payment.connected')}</Text>
            <Pressable
              style={styles.disconnectButton}
              onPress={() => handleDisconnect('bank')}
            >
              <Text style={styles.disconnectText}>{t('payment.disconnect')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.connectButton, { backgroundColor: getMethodColor('bank') }]}
            onPress={handleConnectBank}
          >
            <Text style={styles.connectButtonText}>{t('payment.addBankAccount')}</Text>
          </Pressable>
        )}
      </View>

      {/* Bank Account Modal */}
      <Modal
        visible={showBankModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBankModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('payment.addBankAccount')}</Text>
            <Pressable onPress={() => setShowBankModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payment.accountHolder')} *</Text>
              <TextInput
                style={styles.input}
                value={bankForm.accountHolder}
                onChangeText={(text) => setBankForm({ ...bankForm, accountHolder: text })}
                placeholder={t('payment.accountHolder')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payment.accountNumber')} *</Text>
              <TextInput
                style={styles.input}
                value={bankForm.accountNumber}
                onChangeText={(text) => setBankForm({ ...bankForm, accountNumber: text })}
                placeholder={t('payment.accountNumber')}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payment.bankName')} *</Text>
              <TextInput
                style={styles.input}
                value={bankForm.bankName}
                onChangeText={(text) => setBankForm({ ...bankForm, bankName: text })}
                placeholder={t('payment.bankName')}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payment.routingNumber')}</Text>
              <TextInput
                style={styles.input}
                value={bankForm.routingNumber}
                onChangeText={(text) => setBankForm({ ...bankForm, routingNumber: text })}
                placeholder={t('payment.routingNumber')}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payment.iban')}</Text>
              <TextInput
                style={styles.input}
                value={bankForm.iban}
                onChangeText={(text) => setBankForm({ ...bankForm, iban: text.toUpperCase() })}
                placeholder={t('payment.iban')}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('payment.swift')}</Text>
              <TextInput
                style={styles.input}
                value={bankForm.swift}
                onChangeText={(text) => setBankForm({ ...bankForm, swift: text.toUpperCase() })}
                placeholder={t('payment.swift')}
                autoCapitalize="characters"
              />
            </View>

            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveBankDetails}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>{t('payment.saveBankDetails')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <Pressable onPress={() => setShowCurrencyModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {CURRENCIES.map((currency) => {
              const isSelected = selectedCurrency === currency.code;
              return (
                <Pressable
                  key={currency.code}
                  style={[
                    styles.currencyOption,
                    isSelected && styles.currencyOptionSelected,
                  ]}
                  onPress={() => handleCurrencyChange(currency.code)}
                  disabled={savingCurrency}
                >
                  <View style={styles.currencyOptionContent}>
                    <Text style={styles.currencyOptionFlag}>{currency.flag}</Text>
                    <View style={styles.currencyOptionText}>
                      <Text
                        style={[
                          styles.currencyOptionName,
                          isSelected && styles.currencyOptionNameSelected,
                        ]}
                      >
                        {currency.name}
                      </Text>
                      <Text
                        style={[
                          styles.currencyOptionCode,
                          isSelected && styles.currencyOptionCodeSelected,
                        ]}
                      >
                        {currency.code} • {currency.symbol}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#f25842" />
                  )}
                  {savingCurrency && isSelected && (
                    <ActivityIndicator size="small" color="#f25842" style={{ marginLeft: 8 }} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Remove container background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  methodCard: {
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    borderRadius: borderRadius.lg, // 16px - consistent
    padding: spacing.lg, // 16px - consistent
    marginHorizontal: 0, // No horizontal margin - same width as location box
    marginBottom: spacing.md, // 12px
    ...elevation.level2, // Subtle shadow like other cards
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  connectButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  disconnectButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  disconnectText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: pastelColors.primary[50], // Very light teal #F0FDFD
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12, // More rounded corners
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: pastelColors.primary[100], // Slightly darker teal for contrast
  },
  saveButton: {
    backgroundColor: '#f25842',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currencyCard: {
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    borderRadius: borderRadius.lg, // 16px - consistent
    padding: spacing.lg, // 16px - consistent
    marginHorizontal: 0, // No horizontal margin - same width as location box
    marginBottom: spacing.md, // 12px
    ...elevation.level2, // Subtle shadow like other cards
  },
  currencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  currencyDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  currencySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: pastelColors.primary[50], // Very light teal #F0FDFD
    borderRadius: 12, // More rounded corners
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  currencySelectorText: {
    flex: 1,
  },
  currencySelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  currencySelectorCode: {
    fontSize: 13,
    color: '#6b7280',
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12, // More rounded corners
    marginBottom: 8,
    backgroundColor: pastelColors.primary[50], // Very light teal #F0FDFD
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currencyOptionSelected: {
    backgroundColor: '#fef2f2',
    borderColor: '#f25842',
  },
  currencyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyOptionFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  currencyOptionText: {
    flex: 1,
  },
  currencyOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  currencyOptionNameSelected: {
    color: '#f25842',
  },
  currencyOptionCode: {
    fontSize: 13,
    color: '#6b7280',
  },
  currencyOptionCodeSelected: {
    color: '#dc2626',
  },
});

