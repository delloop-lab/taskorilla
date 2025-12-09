'use client'

import React from 'react'
import { createPortal } from 'react-dom'

export type ModalType = 'success' | 'error' | 'warning' | 'info' | 'confirm'

interface StandardModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm?: () => void
  type: ModalType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
}

export default function StandardModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isLoading = false,
}: StandardModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null)
  const backdropRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    console.log('🟢 [STANDARD MODAL] useEffect triggered - isOpen:', isOpen)
    if (isOpen) {
      console.log('🟢 [STANDARD MODAL] ✅ useEffect - Modal opened, setting body overflow to hidden')
      // Prevent body scroll when modal is open
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      
      // Force a reflow to ensure the modal is rendered
      void document.body.offsetHeight
      
      // CRITICAL CHECK: Verify modal is actually mounted after a brief delay
      const mountCheck = setTimeout(() => {
        const modalElement = document.querySelector('[data-modal="standard-modal"]')
        if (!modalElement) {
          console.error('🟢 [STANDARD MODAL] ❌ CRITICAL: Modal element NOT FOUND in DOM after 50ms!')
          console.error('🟢 [STANDARD MODAL] This means the modal was unmounted or never mounted!')
        } else {
          console.log('🟢 [STANDARD MODAL] ✅ Modal element confirmed in DOM after 50ms')
        }
      }, 50)
      
      // Log DOM state after a brief delay to see if modal is actually in DOM
      const checkInterval = setInterval(() => {
        const modalElement = document.querySelector('[data-modal="standard-modal"]')
        if (modalElement) {
          const rect = (modalElement as HTMLElement).getBoundingClientRect()
          const style = window.getComputedStyle(modalElement as Element)
          console.log('🟢 [STANDARD MODAL] DOM Check - Modal status:', {
            exists: true,
            visible: rect.width > 0 && rect.height > 0,
            display: style.display,
            opacity: style.opacity,
            zIndex: style.zIndex,
            inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
          })
        } else {
          console.log('🟢 [STANDARD MODAL] DOM Check - Modal element NOT FOUND')
        }
      }, 100)
      
      setTimeout(() => clearInterval(checkInterval), 2000)
      
      return () => {
        console.log('🟢 [STANDARD MODAL] ⚠️ useEffect cleanup - Modal is being closed/unmounted')
        console.log('🟢 [STANDARD MODAL] Restoring body overflow')
        document.body.style.overflow = originalOverflow || 'unset'
        clearInterval(checkInterval)
        clearTimeout(mountCheck)
      }
    } else {
      console.log('🟢 [STANDARD MODAL] useEffect - Modal is closed (isOpen: false)')
    }
  }, [isOpen])

  console.log('🟢 [STANDARD MODAL] Component render - isOpen:', isOpen, 'type:', type, 'title:', title, 'isLoading:', isLoading)
  console.log('🟢 [STANDARD MODAL] Props received - onConfirm:', !!onConfirm, 'onClose:', !!onClose)
  
  if (!isOpen) {
    console.log('🟢 [STANDARD MODAL] Early return - isOpen is false')
    return null
  }
  
  console.log('🟢 [STANDARD MODAL] Proceeding to render modal content')

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )
      case 'warning':
      case 'confirm':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        )
      case 'info':
        return (
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )
    }
  }

  const getButtonColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700'
      case 'error':
        return 'bg-red-600 hover:bg-red-700'
      case 'warning':
      case 'confirm':
        return 'bg-yellow-600 hover:bg-yellow-700'
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700'
      default:
        return 'bg-primary-600 hover:bg-primary-700'
    }
  }

  const isConfirmType = type === 'confirm' || (onConfirm !== undefined && type !== 'success' && type !== 'error' && type !== 'info')

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('🟢 [STANDARD MODAL] Backdrop clicked - target:', e.target, 'currentTarget:', e.currentTarget, 'isLoading:', isLoading)
    // Only close on backdrop click if not loading
    // For confirm modals during loading, prevent closing
    if (!isLoading && e.target === e.currentTarget) {
      console.log('🟢 [STANDARD MODAL] Backdrop click - calling onClose')
      onClose()
    } else {
      console.log('🟢 [STANDARD MODAL] Backdrop click - NOT closing (isLoading:', isLoading, 'target match:', e.target === e.currentTarget, ')')
    }
  }

  const handleModalContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('🟢 [STANDARD MODAL] Modal content clicked - stopping propagation')
    e.stopPropagation()
  }

  const handleCancelClick = () => {
    console.log('🟢 [STANDARD MODAL] Cancel button clicked')
    onClose()
  }

  const handleConfirmClick = () => {
    console.log('🟢 [STANDARD MODAL] Confirm button clicked - isLoading:', isLoading, 'isConfirmType:', isConfirmType, 'hasOnConfirm:', !!onConfirm)
    if (isLoading) {
      console.log('🟢 [STANDARD MODAL] Confirm click blocked - isLoading is true')
      return
    }
    if (isConfirmType && onConfirm) {
      console.log('🟢 [STANDARD MODAL] Calling onConfirm handler')
      // For confirm modals, let the parent handle closing
      // The parent will close the modal after the async operation completes
      onConfirm()
    } else {
      console.log('🟢 [STANDARD MODAL] Calling onClose (non-confirm modal)')
      // For non-confirm modals (success, error, info), close immediately
      onClose()
    }
  }

  const modalContent = (
    <div 
      ref={backdropRef}
      data-modal="standard-modal"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4 sm:p-6" 
      onClick={handleBackdropClick}
      style={{ 
        zIndex: 99999, 
        position: 'fixed',
        top: '0px',
        left: '0px',
        right: '0px',
        bottom: '0px',
        width: '100vw',
        height: '100vh',
        minWidth: '100vw',
        minHeight: '100vh',
        display: 'flex',
        visibility: 'visible',
        opacity: 1,
        pointerEvents: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        margin: 0,
        padding: '1rem',
        overflow: 'auto',
        // Force visibility
        clip: 'auto',
        clipPath: 'none'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 sm:p-6 relative z-[100000] mx-4" 
        onClick={handleModalContentClick}
        style={{ 
          position: 'relative',
          zIndex: 100000,
          visibility: 'visible',
          opacity: 1,
          display: 'block',
          pointerEvents: 'auto',
          transform: 'none',
          margin: 'auto',
          maxWidth: '28rem',
          width: '100%',
          backgroundColor: 'white',
          marginLeft: '1rem',
          marginRight: '1rem'
        }}
      >
        {getIcon()}

        <h3 id="modal-title" className="text-lg font-semibold text-gray-900 text-center mb-2">
          {title}
        </h3>

        <p className="text-sm text-gray-600 text-center mb-6 whitespace-pre-line">
          {message}
        </p>

        <div className={`flex gap-3 ${isConfirmType ? 'justify-center' : 'justify-center'}`}>
          {isConfirmType && (
            <button
              onClick={handleCancelClick}
              disabled={isLoading}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirmClick}
            disabled={isLoading}
            type="button"
            className={`px-6 py-2 ${getButtonColor()} text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              type === 'success' || type === 'error' || type === 'info'
                ? 'focus:ring-primary-500'
                : 'focus:ring-yellow-500'
            }`}
          >
            {isConfirmType ? confirmText : confirmText}
          </button>
        </div>
      </div>
    </div>
  )

  // Use portal to render modal at document root to avoid parent container clipping
  if (typeof window !== 'undefined' && isOpen) {
    console.log('🟢 [STANDARD MODAL] Creating portal to document.body')
    console.log('🟢 [STANDARD MODAL] document.body exists:', !!document.body)
    console.log('🟢 [STANDARD MODAL] Modal content type:', typeof modalContent)
    
    // CRITICAL: Ensure we're using the actual document.body, not a shadow DOM or iframe
    const portalTarget = document.body
    if (!portalTarget) {
      console.error('🟢 [STANDARD MODAL] ❌ CRITICAL ERROR: document.body is null!')
      return null
    }
    
    console.log('🟢 [STANDARD MODAL] Portal target:', portalTarget)
    console.log('🟢 [STANDARD MODAL] Portal target tagName:', portalTarget.tagName)
    console.log('🟢 [STANDARD MODAL] Portal target computed style:', window.getComputedStyle(portalTarget))
    
    const portal = createPortal(modalContent, portalTarget)
    
      // Verify portal was created
      setTimeout(() => {
        const modalInDOM = document.querySelector('[data-modal="standard-modal"]')
        console.log('🟢 [STANDARD MODAL] Portal verification - Modal in DOM:', !!modalInDOM)
        if (modalInDOM) {
          const rect = (modalInDOM as HTMLElement).getBoundingClientRect()
          console.log('🟢 [STANDARD MODAL] Portal verification - Backdrop position:', {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0
          })
          const computedStyle = window.getComputedStyle(modalInDOM as Element)
          console.log('🟢 [STANDARD MODAL] Portal verification - Backdrop styles:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            backgroundColor: computedStyle.backgroundColor
          })
          
          // Check the modal content (white box)
          const modalContent = (modalInDOM as HTMLElement).querySelector('.bg-white')
          if (modalContent) {
            const contentRect = (modalContent as HTMLElement).getBoundingClientRect()
            const contentStyle = window.getComputedStyle(modalContent as Element)
            console.log('🟢 [STANDARD MODAL] Portal verification - Modal CONTENT position:', {
              top: contentRect.top,
              left: contentRect.left,
              width: contentRect.width,
              height: contentRect.height,
              visible: contentRect.width > 0 && contentRect.height > 0
            })
            console.log('🟢 [STANDARD MODAL] Portal verification - Modal CONTENT styles:', {
              display: contentStyle.display,
              visibility: contentStyle.visibility,
              opacity: contentStyle.opacity,
              zIndex: contentStyle.zIndex,
              position: contentStyle.position,
              backgroundColor: contentStyle.backgroundColor,
              transform: contentStyle.transform
            })
          } else {
            console.log('🟢 [STANDARD MODAL] Portal verification - Modal CONTENT NOT FOUND!')
          }
          
          // Check for elements that might be covering the modal
          const centerX = window.innerWidth / 2
          const centerY = window.innerHeight / 2
          const allElements = document.elementsFromPoint(centerX, centerY)
          
          console.log('🟢 [STANDARD MODAL] Portal verification - Elements at center point (' + centerX + ', ' + centerY + '):')
          allElements.forEach((el, idx) => {
            const style = window.getComputedStyle(el)
            const rect = el.getBoundingClientRect()
            console.log(`🟢 [STANDARD MODAL]   Element ${idx}:`, {
              tag: el.tagName,
              id: el.id,
              class: el.className,
              zIndex: style.zIndex,
              position: style.position,
              opacity: style.opacity,
              visibility: style.visibility,
              display: style.display,
              isModal: el.hasAttribute('data-modal'),
              isModalContent: el.classList.contains('bg-white'),
              isModalBackdrop: el.hasAttribute('data-modal'),
              rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
            })
          })
          
          // Check if modal backdrop is the top element
          const topElement = allElements[0]
          const modalBackdrop = allElements.find(el => el.hasAttribute('data-modal'))
          const modalContentEl = allElements.find(el => el.classList.contains('bg-white'))
          
          console.log('🟢 [STANDARD MODAL] Portal verification - Top element analysis:')
          console.log('🟢 [STANDARD MODAL]   Top element:', topElement?.tagName, topElement?.className)
          console.log('🟢 [STANDARD MODAL]   Modal backdrop found at index:', modalBackdrop ? allElements.indexOf(modalBackdrop) : -1)
          console.log('🟢 [STANDARD MODAL]   Modal content found at index:', modalContentEl ? allElements.indexOf(modalContentEl) : -1)
          
          if (topElement && !topElement.hasAttribute('data-modal') && !topElement.closest('[data-modal="standard-modal"]')) {
            const topStyle = window.getComputedStyle(topElement)
            console.error('🟢 [STANDARD MODAL] ⚠️ WARNING: Something is covering the modal!')
            console.error('🟢 [STANDARD MODAL] Top element details:', {
              tag: topElement.tagName,
              id: topElement.id,
              class: topElement.className,
              zIndex: topStyle.zIndex,
              position: topStyle.position,
              opacity: topStyle.opacity,
              pointerEvents: topStyle.pointerEvents
            })
          } else if (modalBackdrop && allElements.indexOf(modalBackdrop) === 0) {
            console.log('🟢 [STANDARD MODAL] ✅ Modal backdrop is the top element - modal should be visible!')
          }
        }
      }, 50)
    
    return portal
  }
  
  console.log('🟢 [STANDARD MODAL] Not creating portal - window undefined or isOpen false')
  return null
}







