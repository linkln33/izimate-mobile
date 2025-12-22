import { View, Text, TextInput, Pressable, ScrollView, Image, ActivityIndicator, StyleSheet } from 'react-native'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import type { ListingFormState, ListingFormActions } from '../useListingForm'
import { normalizePhotoUrl } from '@/lib/utils/images'

interface Step1BasicInfoProps {
  formState: ListingFormState
  formActions: ListingFormActions
  loading: boolean
  onPickPhotos: () => void
  titleInputRef: React.RefObject<TextInput>
  categories: string[]
}

export function Step1BasicInfo({
  formState,
  formActions,
  loading,
  onPickPhotos,
  titleInputRef,
  categories,
}: Step1BasicInfoProps) {
  const {
    title,
    description,
    category,
    tags,
    photos,
    categoryDropdownOpen,
    tagInput,
  } = formState

  const {
    setTitle,
    setDescription,
    setCategory,
    setTags,
    setPhotos,
    setCategoryDropdownOpen,
    setTagInput,
  } = formActions

  // Track image loading errors
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  const handleAddTag = () => {
    const newTag = tagInput.trim()
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  return (
    <View>
      <Text style={styles.stepTitle}>Basic Information</Text>

      {/* Title */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          ref={titleInputRef}
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Need a plumber for bathroom repair"
          selectTextOnFocus={false}
          textContentType="none"
          autoCorrect={false}
          autoCapitalize="sentences"
        />
      </View>

      {/* Description */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what you need..."
          multiline
          numberOfLines={6}
          selectTextOnFocus={false}
          textContentType="none"
          autoCorrect={true}
          autoCapitalize="sentences"
        />
      </View>

      {/* Category Dropdown */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Category *</Text>
        <Pressable
          style={styles.categoryDropdownButton}
          onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
        >
          <Text style={[styles.categoryDropdownText, !category && styles.categoryDropdownPlaceholder]}>
            {category || 'Select a category'}
          </Text>
          <Ionicons
            name={categoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#6b7280"
          />
        </Pressable>
        {categoryDropdownOpen && (
          <View style={styles.categoryDropdownMenu}>
            <ScrollView style={styles.categoryDropdownScroll} nestedScrollEnabled={true}>
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryDropdownItem,
                    category === cat && styles.categoryDropdownItemActive,
                  ]}
                  onPress={() => {
                    setCategory(cat)
                    setCategoryDropdownOpen(false)
                  }}
                >
                  <Text
                    style={[
                      styles.categoryDropdownItemText,
                      category === cat && styles.categoryDropdownItemTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                  {category === cat && (
                    <Ionicons name="checkmark" size={20} color="#f25842" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Tags */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagInputContainer}>
          <TextInput
            style={styles.tagInput}
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="Enter tags (e.g., urgent, professional, certified)"
            onSubmitEditing={handleAddTag}
          />
          <Pressable style={styles.addTagButton} onPress={handleAddTag}>
            <Ionicons name="add" size={20} color="#f25842" />
          </Pressable>
        </View>
        {tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {tags.map((tag, index) => (
              <View key={index} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
                <Pressable
                  onPress={() => handleRemoveTag(index)}
                  style={styles.tagRemoveButton}
                >
                  <Ionicons name="close" size={14} color="#ffffff" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Photos */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Photos</Text>
        <Pressable 
          style={[styles.photoButton, loading && styles.photoButtonDisabled]} 
          onPress={onPickPhotos}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#f25842" />
          ) : (
            <>
              <Ionicons name="camera" size={24} color="#f25842" />
              <Text style={styles.photoButtonText}>Add Photos</Text>
            </>
          )}
        </Pressable>
        
        {/* Photo Preview */}
        {photos.length > 0 && (
          <View style={styles.photosPreview}>
            <Text style={styles.photoCount}>{photos.length} photo(s) added</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {photos.map((photo, index) => {
                // Normalize photo URL to ensure it's a valid absolute URL
                // BUT: Preserve blob URLs as-is (they're valid for local preview)
                let normalizedPhoto: string
                if (photo && (photo.startsWith('blob:') || photo.toLowerCase().startsWith('blob:'))) {
                  // Blob URLs should be used as-is - don't normalize them
                  normalizedPhoto = photo
                  if (__DEV__) {
                    console.log(`🖼️ Step1BasicInfo: Preserving blob URL as-is for photo ${index}:`, photo)
                  }
                } else {
                  normalizedPhoto = normalizePhotoUrl(photo)
                  if (__DEV__) {
                    console.log(`🖼️ Step1BasicInfo: Normalized photo ${index}:`, {
                      original: photo,
                      normalized: normalizedPhoto,
                    })
                  }
                }
                
                if (__DEV__ && photo?.startsWith('blob:') && !normalizedPhoto.startsWith('blob:')) {
                  console.error('❌ Blob URL was incorrectly normalized!', {
                    original: photo,
                    normalized: normalizedPhoto,
                  })
                }
                const hasError = imageErrors.has(index)
                
                return (
                  <View key={index} style={styles.photoPreviewItem}>
                    {!hasError ? (
                      <Image 
                        source={{ 
                          uri: normalizedPhoto,
                          cache: 'default', // Use default cache instead of reload
                        }} 
                        style={styles.photoPreviewImage}
                        resizeMode="cover"
                        onError={(error) => {
                          const errorInfo = {
                            originalUrl: photo,
                            normalizedUrl: normalizedPhoto,
                            error: error.nativeEvent?.error || error,
                            errorDetails: error.nativeEvent,
                            errorCode: error.nativeEvent?.error?.code,
                            errorMessage: error.nativeEvent?.error?.message,
                          }
                          console.error(`❌ Image load error for photo ${index}:`, errorInfo)
                          
                          // Try to fetch the URL directly to see what the actual error is
                          fetch(normalizedPhoto, { method: 'HEAD' })
                            .then(response => {
                              console.error(`❌ Direct fetch test for ${normalizedPhoto}:`, {
                                status: response.status,
                                statusText: response.statusText,
                                headers: Object.fromEntries(response.headers.entries()),
                              })
                            })
                            .catch(fetchError => {
                              console.error(`❌ Direct fetch failed:`, fetchError)
                            })
                          
                          setImageErrors(prev => new Set(prev).add(index))
                        }}
                        onLoad={() => {
                          if (__DEV__) {
                            console.log(`✅ Image loaded successfully:`, {
                              index,
                              url: normalizedPhoto,
                              originalUrl: photo,
                            })
                          }
                          // Remove from errors if it loads successfully
                          setImageErrors(prev => {
                            const newSet = new Set(prev)
                            newSet.delete(index)
                            return newSet
                          })
                        }}
                        onLoadStart={() => {
                          if (__DEV__) {
                            console.log(`🔄 Starting to load image ${index}:`, normalizedPhoto)
                          }
                        }}
                        onLoadEnd={() => {
                          if (__DEV__) {
                            console.log(`🏁 Finished loading attempt for image ${index}`)
                          }
                        }}
                      />
                    ) : (
                      <View style={styles.photoErrorContainer}>
                        <Ionicons name="image-outline" size={32} color="#9ca3af" />
                        <Text style={styles.photoErrorText}>Failed to load</Text>
                        <Pressable
                          style={styles.photoRetryButton}
                        onPress={async () => {
                          // Clear error and try loading again
                          setImageErrors(prev => {
                            const newSet = new Set(prev)
                            newSet.delete(index)
                            return newSet
                          })
                          
                          // Verify URL is accessible before retrying
                          if (__DEV__) {
                            try {
                              const testResponse = await fetch(normalizedPhoto, { method: 'HEAD' })
                              console.log(`🔄 Retry - URL accessibility check:`, {
                                url: normalizedPhoto,
                                status: testResponse.status,
                                ok: testResponse.ok,
                              })
                            } catch (error) {
                              console.warn(`⚠️ Retry - URL check failed:`, error)
                            }
                          }
                        }}
                        >
                          <Text style={styles.photoRetryText}>Retry</Text>
                        </Pressable>
                      </View>
                    )}
                    <Pressable
                      style={styles.photoRemoveButton}
                      onPress={() => {
                        setPhotos(photos.filter((_, i) => i !== index))
                        setImageErrors(prev => {
                          const newSet = new Set(prev)
                          newSet.delete(index)
                          return newSet
                        })
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#ffffff" />
                    </Pressable>
                  </View>
                )
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  categoryDropdownButton: {
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
  categoryDropdownText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  categoryDropdownPlaceholder: {
    color: '#9ca3af',
  },
  categoryDropdownMenu: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryDropdownScroll: {
    maxHeight: 250,
  },
  categoryDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryDropdownItemActive: {
    backgroundColor: '#fee2e2',
  },
  categoryDropdownItemText: {
    fontSize: 15,
    color: '#1a1a1a',
    flex: 1,
  },
  categoryDropdownItemTextActive: {
    color: '#f25842',
    fontWeight: '600',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f25842',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  tagChipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  tagRemoveButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#f25842',
    borderStyle: 'dashed',
    minHeight: 56,
  },
  photoButtonDisabled: {
    opacity: 0.6,
  },
  photoButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#f25842',
  },
  photoCount: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  photosPreview: {
    marginTop: 12,
  },
  photosScroll: {
    marginTop: 8,
  },
  photoPreviewItem: {
    position: 'relative',
    marginRight: 12,
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 2,
  },
  photoErrorContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    gap: 8,
  },
  photoErrorText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  photoRetryButton: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f25842',
    borderRadius: 6,
  },
  photoRetryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
})
