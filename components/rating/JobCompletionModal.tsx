import React, { useState } from 'react'
import { View, Text, StyleSheet, Modal, Pressable, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { RatingForm } from './RatingForm'

interface JobCompletionModalProps {
  visible: boolean
  onClose: () => void
  job: {
    id?: string
    title: string
    otherParty: {
      id: string
      name: string
      avatar_url?: string
    }
    serviceType?: string
    isProvider: boolean // true if current user is the service provider
  }
}

export function JobCompletionModal({ visible, onClose, job }: JobCompletionModalProps) {
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [jobMarkedComplete, setJobMarkedComplete] = useState(false)

  const handleMarkComplete = () => {
    Alert.alert(
      'Mark Job Complete',
      `Are you sure you want to mark "${job.title}" as completed? This will notify ${job.otherParty.name} and allow both parties to leave reviews.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark Complete', 
          onPress: () => {
            setJobMarkedComplete(true)
            setShowRatingForm(true)
          }
        }
      ]
    )
  }

  const handleRatingSubmitted = () => {
    setShowRatingForm(false)
    Alert.alert(
      'Thank You!',
      `Your review has been submitted. ${job.otherParty.name} will also be invited to leave a review.`,
      [{ text: 'OK', onPress: onClose }]
    )
  }

  const handleSkipRating = () => {
    Alert.alert(
      'Skip Rating?',
      'You can always rate this job later from your dashboard. Are you sure you want to skip rating now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip for Now', onPress: onClose }
      ]
    )
  }

  if (showRatingForm) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRatingForm(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable 
              onPress={() => setShowRatingForm(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          
          <RatingForm
            revieweeId={job.otherParty.id}
            revieweeName={job.otherParty.name}
            serviceType={job.serviceType}
            jobId={job.id}
            onSubmitted={handleRatingSubmitted}
            onCancel={() => setShowRatingForm(false)}
          />
        </View>
      </Modal>
    )
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            </View>
            <Text style={styles.title}>Job Complete?</Text>
            <Text style={styles.subtitle}>
              {job.isProvider 
                ? `Have you finished the work for "${job.title}"?`
                : `Are you satisfied with the work completed for "${job.title}"?`
              }
            </Text>
          </View>

          {/* Job Details */}
          <View style={styles.jobDetails}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={styles.otherPartyRow}>
              <Text style={styles.otherPartyLabel}>
                {job.isProvider ? 'Client:' : 'Provider:'}
              </Text>
              <Text style={styles.otherPartyName}>{job.otherParty.name}</Text>
            </View>
          </View>

          {/* Information */}
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="information-circle" size={20} color="#3b82f6" />
              <Text style={styles.infoText}>
                Marking as complete will notify {job.otherParty.name} and allow both parties to leave reviews.
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="star" size={20} color="#fbbf24" />
              <Text style={styles.infoText}>
                Reviews help build trust and improve the community experience.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Not Yet</Text>
            </Pressable>
            
            <Pressable style={styles.completeButton} onPress={handleMarkComplete}>
              <Text style={styles.completeButtonText}>Mark Complete</Text>
            </Pressable>
          </View>

          {/* Skip Option */}
          <Pressable style={styles.skipButton} onPress={handleSkipRating}>
            <Text style={styles.skipButtonText}>
              Mark complete without rating (can rate later)
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  jobDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  otherPartyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otherPartyLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 8,
  },
  otherPartyName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  skipButton: {
    alignItems: 'center',
    padding: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
})