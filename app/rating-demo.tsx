import React, { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { JobCompletionModal } from '@/components/rating/JobCompletionModal'
import { RatingForm } from '@/components/rating/RatingForm'

export default function RatingDemoScreen() {
  const router = useRouter()
  const [showJobModal, setShowJobModal] = useState(false)
  const [showRatingForm, setShowRatingForm] = useState(false)

  // Mock job data
  const mockJob = {
    id: 'demo-job-1',
    title: 'Website Design & Development',
    otherParty: {
      id: 'demo-user-1',
      name: 'Sarah Johnson',
      avatar_url: null,
    },
    serviceType: 'web_design',
    isProvider: false, // Current user is the client
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.title}>Rating System Demo</Text>
      </View>

      {/* Demo Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Post-Job Rating System</Text>
        <Text style={styles.description}>
          This demonstrates how the rating system works after a job is completed. 
          Users can rate each other on 5 criteria to build trust and improve service quality.
        </Text>
      </View>

      {/* Rating Criteria */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5 Rating Criteria</Text>
        <View style={styles.criteriaList}>
          {[
            { icon: 'checkmark-circle', label: 'As Described', color: '#10b981' },
            { icon: 'time', label: 'Timing', color: '#3b82f6' },
            { icon: 'chatbubbles', label: 'Communication', color: '#8b5cf6' },
            { icon: 'card', label: 'Cost', color: '#f59e0b' },
            { icon: 'trophy', label: 'Overall Experience', color: '#f25842' },
          ].map((criteria, index) => (
            <View key={index} style={styles.criteriaItem}>
              <Ionicons 
                name={criteria.icon as any} 
                size={20} 
                color={criteria.color} 
              />
              <Text style={styles.criteriaLabel}>{criteria.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Demo Buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Try the Rating System</Text>
        
        <Pressable 
          style={styles.demoButton}
          onPress={() => setShowJobModal(true)}
        >
          <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
          <Text style={styles.demoButtonText}>
            Demo: Job Completion Flow
          </Text>
        </Pressable>

        <Pressable 
          style={[styles.demoButton, styles.secondaryButton]}
          onPress={() => setShowRatingForm(true)}
        >
          <Ionicons name="star" size={24} color="#f25842" />
          <Text style={[styles.demoButtonText, styles.secondaryButtonText]}>
            Demo: Rating Form Only
          </Text>
        </Pressable>
      </View>

      {/* Implementation Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Implementation Notes</Text>
        <View style={styles.notesList}>
          <View style={styles.noteItem}>
            <Text style={styles.noteNumber}>1.</Text>
            <Text style={styles.noteText}>
              Run the SQL script in Supabase to create the rating tables and functions
            </Text>
          </View>
          <View style={styles.noteItem}>
            <Text style={styles.noteNumber}>2.</Text>
            <Text style={styles.noteText}>
              Integrate job completion triggers in your messaging/job management system
            </Text>
          </View>
          <View style={styles.noteItem}>
            <Text style={styles.noteNumber}>3.</Text>
            <Text style={styles.noteText}>
              Add notification system for rating reminders
            </Text>
          </View>
          <View style={styles.noteItem}>
            <Text style={styles.noteNumber}>4.</Text>
            <Text style={styles.noteText}>
              The profile ratings will automatically update when reviews are submitted
            </Text>
          </View>
        </View>
      </View>

      {/* Job Completion Modal */}
      <JobCompletionModal
        visible={showJobModal}
        onClose={() => setShowJobModal(false)}
        job={mockJob}
      />

      {/* Rating Form Modal */}
      {showRatingForm && (
        <View style={styles.ratingFormContainer}>
          <View style={styles.ratingFormHeader}>
            <Text style={styles.ratingFormTitle}>Rate Your Experience</Text>
            <Pressable 
              onPress={() => setShowRatingForm(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6b7280" />
            </Pressable>
          </View>
          <RatingForm
            revieweeId={mockJob.otherParty.id}
            revieweeName={mockJob.otherParty.name}
            serviceType={mockJob.serviceType}
            jobId={mockJob.id}
            onSubmitted={() => setShowRatingForm(false)}
            onCancel={() => setShowRatingForm(false)}
          />
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  section: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  criteriaList: {
    gap: 12,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  criteriaLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
    fontWeight: '500',
  },
  demoButton: {
    backgroundColor: '#f25842',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  demoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f25842',
  },
  secondaryButtonText: {
    color: '#f25842',
  },
  notesList: {
    gap: 12,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noteNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f25842',
    marginRight: 8,
    minWidth: 20,
  },
  noteText: {
    fontSize: 16,
    color: '#6b7280',
    flex: 1,
    lineHeight: 22,
  },
  ratingFormContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    zIndex: 1000,
  },
  ratingFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  ratingFormTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
  },
})