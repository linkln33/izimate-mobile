import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, Modal, ActivityIndicator, Linking, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { triggerLight, triggerSuccess, triggerWarning } from '@/lib/utils/haptics'
import { pastelDesignSystem } from '@/lib/pastel-design-system'
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem

interface SupportTicket {
  id: string
  subject: string
  description: string
  category: string
  priority: string
  status: string
  created_at: string
  updated_at: string
}

export const HelpSupport: React.FC = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  
  // Ticket form state
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    category: 'other' as 'technical' | 'billing' | 'account' | 'feature_request' | 'bug_report' | 'other',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  })

  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setTickets(data || [])
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      triggerWarning()
      Alert.alert(
        t('helpSupport.error'),
        t('helpSupport.fillAllFields')
      )
      return
    }

    try {
      setLoading(true)
      triggerLight()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          subject: ticketForm.subject.trim(),
          description: ticketForm.description.trim(),
          category: ticketForm.category,
          priority: ticketForm.priority,
          status: 'open',
        })
        .select()
        .single()

      if (error) throw error

      triggerSuccess()
      Alert.alert(
        t('helpSupport.success'),
        t('helpSupport.ticketCreated')
      )
      
      setShowTicketModal(false)
      setTicketForm({
        subject: '',
        description: '',
        category: 'other',
        priority: 'medium',
      })
      loadTickets()
    } catch (error) {
      console.error('Error creating ticket:', error)
      triggerWarning()
      Alert.alert(
        t('helpSupport.error'),
        t('helpSupport.ticketCreationFailed')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCommunity = () => {
    // You can replace this with your actual community URL
    const communityUrl = 'https://community.izimate.com' // Replace with your community URL
    Linking.openURL(communityUrl).catch((err) => {
      console.error('Error opening community:', err)
      Alert.alert(
        t('helpSupport.error'),
        t('helpSupport.communityLinkFailed')
      )
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return pastelColors.primary[500]
      case 'in_progress':
        return pastelColors.accent[500]
      case 'resolved':
        return pastelColors.success[500]
      case 'closed':
        return pastelColors.neutral[500]
      default:
        return pastelColors.neutral[500]
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#f25842'
      case 'high':
        return pastelColors.secondary[500]
      case 'medium':
        return pastelColors.accent[500]
      case 'low':
        return pastelColors.neutral[500]
      default:
        return pastelColors.neutral[500]
    }
  }

  return (
    <View style={styles.container}>
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => setShowTicketModal(true)}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: pastelColors.primary[100] }]}>
            <Ionicons name="ticket-outline" size={24} color={pastelColors.primary[600]} />
          </View>
          <Text style={styles.actionText}>{t('helpSupport.openTicket')}</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={() => setShowHelpModal(true)}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: pastelColors.secondary[100] }]}>
            <Ionicons name="help-circle-outline" size={24} color={pastelColors.secondary[600]} />
          </View>
          <Text style={styles.actionText}>{t('helpSupport.getHelp')}</Text>
        </Pressable>

        <Pressable
          style={styles.actionButton}
          onPress={handleOpenCommunity}
        >
          <View style={[styles.actionIconContainer, { backgroundColor: pastelColors.accent[100] }]}>
            <Ionicons name="people-outline" size={24} color={pastelColors.accent[600]} />
          </View>
          <Text style={styles.actionText}>{t('helpSupport.askCommunity')}</Text>
        </Pressable>
      </View>

      {/* Recent Tickets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('helpSupport.myTickets')}</Text>
        {loading && tickets.length === 0 ? (
          <ActivityIndicator size="small" color={pastelColors.primary[500]} style={styles.loader} />
        ) : tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={48} color={pastelColors.neutral[400]} />
            <Text style={styles.emptyStateText}>{t('helpSupport.noTickets')}</Text>
            <Text style={styles.emptyStateSubtext}>{t('helpSupport.createFirstTicket')}</Text>
          </View>
        ) : (
          <ScrollView style={styles.ticketsList}>
            {tickets.map((ticket) => (
              <Pressable
                key={ticket.id}
                style={styles.ticketCard}
              >
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketSubject} numberOfLines={1}>
                    {ticket.subject}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ticket.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(ticket.status) }]}>
                      {t(`helpSupport.status.${ticket.status}`)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.ticketDescription} numberOfLines={2}>
                  {ticket.description}
                </Text>
                <View style={styles.ticketFooter}>
                  <View style={styles.ticketMeta}>
                    <Ionicons name="pricetag-outline" size={14} color={pastelColors.neutral[500]} />
                    <Text style={styles.ticketMetaText}>
                      {t(`helpSupport.category.${ticket.category}`)}
                    </Text>
                  </View>
                  <View style={styles.ticketMeta}>
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(ticket.priority) }]} />
                    <Text style={styles.ticketMetaText}>
                      {t(`helpSupport.priority.${ticket.priority}`)}
                    </Text>
                  </View>
                  <Text style={styles.ticketDate}>
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Create Ticket Modal */}
      <Modal
        visible={showTicketModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTicketModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('helpSupport.createTicket')}</Text>
            <Pressable onPress={() => setShowTicketModal(false)}>
              <Ionicons name="close" size={24} color={pastelColors.neutral[700]} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('helpSupport.subject')}</Text>
              <TextInput
                style={styles.input}
                value={ticketForm.subject}
                onChangeText={(text) => setTicketForm({ ...ticketForm, subject: text })}
                placeholder={t('helpSupport.subjectPlaceholder')}
                maxLength={200}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('helpSupport.category')}</Text>
              <View style={styles.categoryButtons}>
                {(['technical', 'billing', 'account', 'feature_request', 'bug_report', 'other'] as const).map((cat) => (
                  <Pressable
                    key={cat}
                    style={[
                      styles.categoryButton,
                      ticketForm.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() => setTicketForm({ ...ticketForm, category: cat })}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        ticketForm.category === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {t(`helpSupport.category.${cat}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('helpSupport.priority')}</Text>
              <View style={styles.priorityButtons}>
                {(['low', 'medium', 'high', 'urgent'] as const).map((pri) => (
                  <Pressable
                    key={pri}
                    style={[
                      styles.priorityButton,
                      ticketForm.priority === pri && styles.priorityButtonActive,
                    ]}
                    onPress={() => setTicketForm({ ...ticketForm, priority: pri })}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        ticketForm.priority === pri && styles.priorityButtonTextActive,
                      ]}
                    >
                      {t(`helpSupport.priority.${pri}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('helpSupport.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={ticketForm.description}
                onChangeText={(text) => setTicketForm({ ...ticketForm, description: text })}
                placeholder={t('helpSupport.descriptionPlaceholder')}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <Pressable
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleCreateTicket}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>{t('helpSupport.submitTicket')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal
        visible={showHelpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('helpSupport.getHelp')}</Text>
            <Pressable onPress={() => setShowHelpModal(false)}>
              <Ionicons name="close" size={24} color={pastelColors.neutral[700]} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.helpSection}>
              <Ionicons name="document-text-outline" size={32} color={pastelColors.primary[500]} />
              <Text style={styles.helpTitle}>{t('helpSupport.faq')}</Text>
              <Text style={styles.helpDescription}>
                {t('helpSupport.faqDescription')}
              </Text>
              <Pressable style={styles.helpButton}>
                <Text style={styles.helpButtonText}>{t('helpSupport.viewFaq')}</Text>
                <Ionicons name="chevron-forward" size={20} color={pastelColors.primary[600]} />
              </Pressable>
            </View>

            <View style={styles.helpSection}>
              <Ionicons name="mail-outline" size={32} color={pastelColors.secondary[500]} />
              <Text style={styles.helpTitle}>{t('helpSupport.contactSupport')}</Text>
              <Text style={styles.helpDescription}>
                {t('helpSupport.contactSupportDescription')}
              </Text>
              <Pressable
                style={styles.helpButton}
                onPress={() => {
                  setShowHelpModal(false)
                  setShowTicketModal(true)
                }}
              >
                <Text style={styles.helpButtonText}>{t('helpSupport.openTicket')}</Text>
                <Ionicons name="chevron-forward" size={20} color={pastelColors.secondary[600]} />
              </Pressable>
            </View>

            <View style={styles.helpSection}>
              <Ionicons name="people-outline" size={32} color={pastelColors.accent[500]} />
              <Text style={styles.helpTitle}>{t('helpSupport.community')}</Text>
              <Text style={styles.helpDescription}>
                {t('helpSupport.communityDescription')}
              </Text>
              <Pressable
                style={styles.helpButton}
                onPress={() => {
                  setShowHelpModal(false)
                  handleOpenCommunity()
                }}
              >
                <Text style={styles.helpButtonText}>{t('helpSupport.visitCommunity')}</Text>
                <Ionicons name="chevron-forward" size={20} color={pastelColors.accent[600]} />
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    ...elevation.level1,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: surfaces.onSurface,
    textAlign: 'center',
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl * 2,
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    ...elevation.level1,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  ticketsList: {
    maxHeight: 400,
  },
  ticketCard: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...elevation.level1,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ticketDescription: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ticketMetaText: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ticketDate: {
    fontSize: 12,
    color: surfaces.onSurfaceVariant,
    marginLeft: 'auto',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: surfaces.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    backgroundColor: surfaces.surface,
    borderBottomWidth: 1,
    borderBottomColor: surfaces.outline,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: surfaces.onSurface,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    color: surfaces.onSurface,
    borderWidth: 1,
    borderColor: surfaces.outline,
  },
  textArea: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: surfaces.outline,
  },
  categoryButtonActive: {
    backgroundColor: pastelColors.primary[100],
    borderColor: pastelColors.primary[500],
  },
  categoryButtonText: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  categoryButtonTextActive: {
    color: pastelColors.primary[700],
    fontWeight: '600',
  },
  priorityButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  priorityButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: surfaces.surface,
    borderWidth: 1,
    borderColor: surfaces.outline,
  },
  priorityButtonActive: {
    backgroundColor: pastelColors.secondary[100],
    borderColor: pastelColors.secondary[500],
  },
  priorityButtonText: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  priorityButtonTextActive: {
    color: pastelColors.secondary[700],
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: pastelColors.primary[500],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  helpSection: {
    backgroundColor: surfaces.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...elevation.level1,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: surfaces.onSurface,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  helpDescription: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  helpButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: pastelColors.primary[600],
  },
})

