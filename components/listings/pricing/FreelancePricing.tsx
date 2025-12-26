/**
 * Freelance Pricing Component (Includes UGC Creator)
 * Handles pricing configuration for freelance listings including UGC creators
 */

import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions, BudgetType } from '../useListingForm'
import { CURRENCIES, type Currency } from './types'

interface FreelancePricingProps {
  formState: ListingFormState
  formActions: ListingFormActions
}

export function FreelancePricing({ formState, formActions }: FreelancePricingProps) {
  const {
    currency,
    freelance_category,
    freelance_portfolio_url,
    freelance_delivery_days,
    freelance_revisions_included,
    freelance_skills,
    budgetType,
    budgetMin,
  } = formState

  const {
    setFreelanceCategory,
    setFreelancePortfolioUrl,
    setFreelanceDeliveryDays,
    setFreelanceRevisionsIncluded,
    setFreelanceSkills,
    setBudgetType,
    setBudgetMin,
    setCurrency,
  } = formActions

  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false)
  const selectedCurrency: Currency = CURRENCIES.find(c => c.code === currency) || CURRENCIES[0]
  const [skillInput, setSkillInput] = useState('')

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      const updated = [...(freelance_skills || []), skillInput.trim()]
      setFreelanceSkills?.(updated)
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (index: number) => {
    const updated = (freelance_skills || []).filter((_, i) => i !== index)
    setFreelanceSkills?.(updated)
  }

  const isUGC = freelance_category === 'ugc'

  return (
    <>
      {/* Currency Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Currency</Text>
        <Pressable
          style={styles.currencyDropdownButton}
          onPress={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
        >
          <Text style={styles.currencyDropdownText}>
            {selectedCurrency.symbol} {selectedCurrency.code} - {selectedCurrency.name}
          </Text>
          <Ionicons
            name={currencyDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6b7280"
          />
        </Pressable>
        {currencyDropdownOpen && (
          <View style={styles.currencyDropdownMenu}>
            <ScrollView style={styles.currencyDropdownScroll} nestedScrollEnabled={true}>
              {CURRENCIES.map((curr) => (
                <Pressable
                  key={curr.code}
                  style={[
                    styles.currencyDropdownItem,
                    currency === curr.code && styles.currencyDropdownItemActive,
                  ]}
                  onPress={() => {
                    setCurrency?.(curr.code)
                    setCurrencyDropdownOpen(false)
                  }}
                >
                  <Text
                    style={[
                      styles.currencyDropdownItemText,
                      currency === curr.code && styles.currencyDropdownItemTextActive,
                    ]}
                  >
                    {curr.symbol} {curr.code} - {curr.name}
                  </Text>
                  {currency === curr.code && (
                    <Ionicons name="checkmark" size={20} color="#f25842" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        <Text style={styles.inputHelp}>
          Select the currency for your pricing
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Freelance Category</Text>
        <View style={styles.budgetTypeButtons}>
          {(['ugc', 'design', 'writing', 'video', 'photography', 'social_media', 'consulting', 'other'] as const).map((category) => (
            <Pressable
              key={category}
              style={[
                styles.budgetTypeButton,
                freelance_category === category && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setFreelanceCategory?.(category)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  freelance_category === category && styles.budgetTypeButtonTextActive,
                ]}
              >
                {category === 'ugc' ? 'UGC Creator' : category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Portfolio URL</Text>
        <TextInput
          style={styles.input}
          value={freelance_portfolio_url || ''}
          onChangeText={setFreelancePortfolioUrl}
          placeholder="https://tiktok.com/@creator or https://yourportfolio.com"
          keyboardType="url"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Link to your portfolio, TikTok, Instagram, YouTube, or personal website
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Skills</Text>
        <View style={styles.skillsContainer}>
          {(freelance_skills || []).map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillTagText}>{skill}</Text>
              <Pressable onPress={() => handleRemoveSkill(index)}>
                <Ionicons name="close-circle" size={18} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
        <View style={styles.skillInputContainer}>
          <TextInput
            style={styles.skillInput}
            value={skillInput}
            onChangeText={setSkillInput}
            placeholder="e.g., TikTok Videos, Product Reviews"
            placeholderTextColor="#9ca3af"
            onSubmitEditing={handleAddSkill}
          />
          <Pressable onPress={handleAddSkill} style={styles.addSkillButton}>
            <Ionicons name="add-circle" size={24} color="#f25842" />
          </Pressable>
        </View>
        <Text style={styles.inputHelp}>
          Add skills that describe your expertise
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Pricing Model</Text>
        <View style={styles.budgetTypeButtons}>
          {(['fixed', 'per_project', 'per_hour'] as const).map((type) => (
            <Pressable
              key={type}
              style={[
                styles.budgetTypeButton,
                budgetType === type && styles.budgetTypeButtonActive,
              ]}
              onPress={() => setBudgetType(type as BudgetType)}
            >
              <Text
                style={[
                  styles.budgetTypeButtonText,
                  budgetType === type && styles.budgetTypeButtonTextActive,
                ]}
              >
                {type === 'per_project' ? 'Per Project' : type === 'per_hour' ? 'Per Hour' : 'Fixed Price'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {(budgetType === 'fixed' || budgetType === 'per_project' || budgetType === 'per_hour') && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {budgetType === 'fixed' ? 'Fixed Price' : budgetType === 'per_project' ? 'Price per Project' : 'Hourly Rate'} ({selectedCurrency.symbol})
          </Text>
          <TextInput
            style={styles.input}
            value={budgetMin || ''}
            onChangeText={setBudgetMin}
            placeholder={budgetType === 'per_hour' ? 'e.g., 50' : 'e.g., 500'}
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />
          <Text style={styles.inputHelp}>
            {budgetType === 'fixed' 
              ? 'One-time project fee (e.g., $500 for 3 TikTok videos)'
              : budgetType === 'per_project'
              ? 'Price per content piece (e.g., $150 per video)'
              : 'Hourly rate for consultation or content creation'}
          </Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Delivery Days</Text>
        <TextInput
          style={styles.input}
          value={freelance_delivery_days ? String(freelance_delivery_days) : ''}
          onChangeText={(text) => setFreelanceDeliveryDays?.(parseInt(text) || 0)}
          placeholder="e.g., 5"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Estimated turnaround time in days
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Revisions Included</Text>
        <TextInput
          style={styles.input}
          value={freelance_revisions_included ? String(freelance_revisions_included) : ''}
          onChangeText={(text) => setFreelanceRevisionsIncluded?.(parseInt(text) || 0)}
          placeholder="e.g., 2"
          keyboardType="numeric"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.inputHelp}>
          Number of free revisions included in the service
        </Text>
      </View>

      {isUGC && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>UGC Creator - Content Specifications</Text>
          <Text style={styles.inputHelp}>
            Additional UGC-specific fields will be added here (content type, platforms, video length, etc.)
          </Text>
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  budgetTypeButtons: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  budgetTypeButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  budgetTypeButtonActive: {
    backgroundColor: '#f25842',
    borderColor: '#f25842',
  },
  budgetTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  budgetTypeButtonTextActive: {
    color: '#ffffff',
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputHelp: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 6,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  skillTagText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  skillInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  skillInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  addSkillButton: {
    padding: 4,
  },
  currencyDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyDropdownText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  currencyDropdownMenu: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  currencyDropdownScroll: {
    maxHeight: 300,
  },
  currencyDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  currencyDropdownItemActive: {
    backgroundColor: '#fee2e2',
  },
  currencyDropdownItemText: {
    fontSize: 15,
    color: '#1a1a1a',
    flex: 1,
  },
  currencyDropdownItemTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
})

