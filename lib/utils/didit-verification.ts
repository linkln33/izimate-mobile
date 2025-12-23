// Didit Verification Integration
// Based on https://didit.me/ru/ capabilities
import { DIDIT_CONFIG } from '../../didit-config'

export interface DidItVerificationConfig {
  apiKey: string
  baseUrl: string // https://api.didit.me
  workflowId?: string
}

// Get Didit configuration from environment or fallback to config file
export function getDiditConfig(): DidItVerificationConfig {
  return {
    apiKey: process.env.EXPO_PUBLIC_DIDIT_API_KEY || DIDIT_CONFIG.API_KEY,
    baseUrl: 'https://api.didit.me',
    workflowId: process.env.EXPO_PUBLIC_DIDIT_WORKFLOW_ID || DIDIT_CONFIG.WORKFLOW_ID
  }
}

export interface DidItVerificationSession {
  sessionId: string
  verificationUrl: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface DidItVerificationResult {
  sessionId: string
  status: 'verified' | 'failed' | 'rejected'
  documentType: string
  documentCountry: string
  extractedData: {
    firstName?: string
    lastName?: string
    dateOfBirth?: string
    documentNumber?: string
    expiryDate?: string
  }
  livenessCheck: boolean
  faceMatch: boolean
  amlScreening?: {
    status: 'clear' | 'flagged'
    riskLevel: 'low' | 'medium' | 'high'
  }
  confidence: number
  completedAt: string
}

/**
 * Create Didit verification session for identity verification
 * Free tier includes: ID verification, face match, liveness, IP analysis
 */
export async function createDiditIdentityVerification(
  userId: string,
  config: DidItVerificationConfig
): Promise<DidItVerificationSession> {
  const response = await fetch(`${config.baseUrl}/v1/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: config.workflowId || 'basic_kyc', // Free tier workflow
      user_reference: userId,
      redirect_url: `${process.env.EXPO_PUBLIC_SITE_URL}/verification/callback`,
      webhook_url: `${process.env.EXPO_PUBLIC_SITE_URL}/api/verification/webhook`,
      settings: {
        language: 'en',
        theme: {
          primary_color: '#f25842', // Your brand color
        }
      }
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create Didit verification session')
  }

  const data = await response.json()
  
  return {
    sessionId: data.session_id,
    verificationUrl: data.verification_url,
    status: 'pending'
  }
}

/**
 * Create business verification workflow
 * Includes: Business registration check, AML screening, address verification
 */
export async function createDiditBusinessVerification(
  userId: string,
  businessData: {
    companyName: string
    registrationNumber: string
    country: string
    address: string
  },
  config: DidItVerificationConfig
): Promise<DidItVerificationSession> {
  const response = await fetch(`${config.baseUrl}/v1/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      workflow_id: 'business_verification',
      user_reference: userId,
      redirect_url: `${process.env.EXPO_PUBLIC_SITE_URL}/verification/business/callback`,
      webhook_url: `${process.env.EXPO_PUBLIC_SITE_URL}/api/verification/business/webhook`,
      prefill_data: {
        company_name: businessData.companyName,
        registration_number: businessData.registrationNumber,
        country: businessData.country,
        address: businessData.address,
      },
      checks: [
        'business_registration', // Companies House for UK
        'aml_screening',
        'address_verification',
        'beneficial_ownership' // For enhanced verification
      ]
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to create Didit business verification session')
  }

  const data = await response.json()
  
  return {
    sessionId: data.session_id,
    verificationUrl: data.verification_url,
    status: 'pending'
  }
}

/**
 * Get verification result from Didit
 */
export async function getDiditVerificationResult(
  sessionId: string,
  config: DidItVerificationConfig
): Promise<DidItVerificationResult> {
  const response = await fetch(`${config.baseUrl}/v1/sessions/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get verification result')
  }

  const data = await response.json()
  
  return {
    sessionId: data.session_id,
    status: data.status,
    documentType: data.document_type,
    documentCountry: data.document_country,
    extractedData: data.extracted_data,
    livenessCheck: data.liveness_check,
    faceMatch: data.face_match,
    amlScreening: data.aml_screening,
    confidence: data.confidence,
    completedAt: data.completed_at,
  }
}

/**
 * Calculate verification score based on Didit results
 */
export function calculateVerificationScore(
  identityResult?: DidItVerificationResult,
  businessResult?: DidItVerificationResult
): number {
  let score = 0

  if (identityResult?.status === 'verified') {
    score += 40 // Base identity verification
    
    if (identityResult.livenessCheck) score += 10
    if (identityResult.faceMatch) score += 10
    if (identityResult.confidence >= 0.9) score += 10
    if (identityResult.amlScreening?.status === 'clear') score += 10
  }

  if (businessResult?.status === 'verified') {
    score += 20 // Business verification
  }

  return Math.min(score, 100)
}

/**
 * Didit webhook payload interface
 */
export interface DidItWebhookPayload {
  session_id: string
  status: 'completed' | 'failed' | 'rejected'
  user_reference: string
  verification_result: DidItVerificationResult
  timestamp: string
}