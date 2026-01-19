'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import EmailTemplateEditor from './EmailTemplateEditor'
import StandardModal from './StandardModal'

interface EmailTemplate {
  id: string
  template_type: string
  subject: string
  html_content: string
  created_at: string
  updated_at: string
}

interface EmailTemplateManagerProps {
  onTemplateSent?: () => void
  onTemplateChange?: () => void
  users?: Array<{ id: string; full_name?: string | null; email: string; is_helper?: boolean }>
  emailTemplates?: Array<{ id: string; template_type: string; subject: string }>
  onSendWelcomeEmail?: (userId: string, templateType: string) => Promise<void>
  onSendFreeFormEmail?: (recipientId: string, subject: string, content: string) => Promise<void>
  sendingEmail?: boolean
}

export default function EmailTemplateManager({ 
  onTemplateSent, 
  onTemplateChange,
  users = [],
  emailTemplates = [],
  onSendWelcomeEmail,
  onSendFreeFormEmail,
  sendingEmail = false,
}: EmailTemplateManagerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)
  const [testEmail, setTestEmail] = useState('lou@schillaci.me')
  const [sendingTest, setSendingTest] = useState(false)
  const [selectedTestTemplateId, setSelectedTestTemplateId] = useState<string>('')
  const [testTemplateContent, setTestTemplateContent] = useState<{ subject: string; htmlContent: string } | null>(null)
  const [freeFormEmailMode, setFreeFormEmailMode] = useState(false)
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<string>('')
  const [selectedEmailTemplate, setSelectedEmailTemplate] = useState<string>('')
  const [freeFormRecipient, setFreeFormRecipient] = useState<string>('')
  const [freeFormSubject, setFreeFormSubject] = useState('')
  const [freeFormContent, setFreeFormContent] = useState('')
  const [templateFilters, setTemplateFilters] = useState({
    name: '',
    subject: '',
  })
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error' | 'warning'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  })

  // Load all templates on mount
  useEffect(() => {
    loadAllTemplates()
  }, [])

  // Load template when selection changes
  useEffect(() => {
    if (selectedTemplateId && !isCreatingNew) {
      loadTemplate(selectedTemplateId)
    } else if (isCreatingNew) {
      // Reset form for new template
      setTemplate(null)
      setSubject('')
      setHtmlContent('')
    }
  }, [selectedTemplateId, isCreatingNew])

  const loadAllTemplates = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch('/api/admin/email-templates', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Admin access required')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to load templates: ${response.statusText}`)
      }

      const result = await response.json()
      setTemplates(result.templates || [])
    } catch (error: any) {
      console.error('Error loading templates:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load templates: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setLoading(false)
    }
  }

  const loadTemplate = async (templateId: string) => {
    setLoading(true)
    try {
      // Find template from already loaded templates list
      const foundTemplate = templates.find((t: EmailTemplate) => t.id === templateId)
      
      if (foundTemplate) {
        setTemplate(foundTemplate)
        setSubject(foundTemplate.subject)
        setHtmlContent(foundTemplate.html_content)
      } else {
        // If not found, reload all templates
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Not authenticated')
        }

        const response = await fetch('/api/admin/email-templates', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          const allTemplates = result.templates || []
          const foundAfterReload = allTemplates.find((t: EmailTemplate) => t.id === templateId)
          if (foundAfterReload) {
            setTemplate(foundAfterReload)
            setSubject(foundAfterReload.subject)
            setHtmlContent(foundAfterReload.html_content)
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading template:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to load template: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setIsCreatingNew(true)
    setSelectedTemplateId(null)
    setNewTemplateName('')
    setSubject('')
    setHtmlContent('')
    setTemplate(null)
  }

  const handleSelectTemplate = (templateId: string) => {
    setIsCreatingNew(false)
    setSelectedTemplateId(templateId)
    setNewTemplateName('')
  }

  const saveTemplate = async () => {
    if (!subject.trim() || !htmlContent.trim()) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please fill in both subject and content',
      })
      return
    }

    if (isCreatingNew && !newTemplateName.trim()) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: 'Please enter a template name',
      })
      return
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const templateType = isCreatingNew ? newTemplateName.trim() : (template?.template_type || selectedTemplateId || '')
      
      const templateData = {
        template_type: templateType,
        subject: subject.trim(),
        html_content: htmlContent,
      }

      const url = template && !isCreatingNew
        ? `/api/admin/email-templates?id=${template.id}`
        : '/api/admin/email-templates'

      const method = template && !isCreatingNew ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(templateData),
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Admin access required')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to save template: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Reload templates list
      await loadAllTemplates()
      
      // If creating new, select the newly created template
      if (isCreatingNew && result.template) {
        setIsCreatingNew(false)
        setSelectedTemplateId(result.template.id)
        setTemplate(result.template)
      } else if (result.template) {
        setTemplate(result.template)
      }

      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Template saved successfully!',
      })
      
      if (onTemplateChange) {
        onTemplateChange()
      }
    } catch (error: any) {
      console.error('Error saving template:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to save template: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setSaving(false)
    }
  }

  const loadTestTemplate = async (templateId: string) => {
    if (!templateId) {
      setTestTemplateContent(null)
      return
    }

    try {
      const foundTemplate = templates.find((t: EmailTemplate) => t.id === templateId)
      if (foundTemplate) {
        setTestTemplateContent({
          subject: foundTemplate.subject,
          htmlContent: foundTemplate.html_content,
        })
      } else {
        // If not found, try to fetch it
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Not authenticated')
        }

        const response = await fetch('/api/admin/email-templates', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          const allTemplates = result.templates || []
          const foundAfterReload = allTemplates.find((t: EmailTemplate) => t.id === templateId)
          if (foundAfterReload) {
            setTestTemplateContent({
              subject: foundAfterReload.subject,
              htmlContent: foundAfterReload.html_content,
            })
          }
        }
      }
    } catch (error: any) {
      console.error('Error loading test template:', error)
      setTestTemplateContent(null)
    }
  }

  useEffect(() => {
    if (selectedTestTemplateId) {
      loadTestTemplate(selectedTestTemplateId)
    } else {
      setTestTemplateContent(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTestTemplateId, templates])

  const sendTestEmail = async () => {
    // Determine which content to use: selected template or current editor content
    const testSubject = selectedTestTemplateId && testTemplateContent
      ? testTemplateContent.subject
      : subject.trim()
    
    const testHtmlContent = selectedTestTemplateId && testTemplateContent
      ? testTemplateContent.htmlContent
      : htmlContent

    if (!testSubject || !testHtmlContent.trim()) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Missing Information',
        message: selectedTestTemplateId
          ? 'Selected template is missing subject or content'
          : 'Please fill in both subject and content, or select a template to test',
      })
      return
    }

    if (!testEmail.trim() || !testEmail.includes('@')) {
      setModalState({
        isOpen: true,
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid test email address',
      })
      return
    }

    setSendingTest(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Send test email using the template email API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          type: 'template_email',
          templateType: 'test_email', // Special type for test emails
          recipientEmail: testEmail.trim(),
          recipientName: 'Test Recipient',
          subject: `[TEST] ${testSubject}`,
          htmlContent: testHtmlContent,
          variables: {
            user_name: 'Test Recipient',
            user_first_name: 'Test',
            user_email: testEmail.trim(),
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to send test email: ${response.statusText}`)
      }

      const templateName = selectedTestTemplateId
        ? templates.find((t: EmailTemplate) => t.id === selectedTestTemplateId)?.template_type || 'selected template'
        : 'current template'

      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Test Email Sent',
        message: `Test email sent successfully to ${testEmail.trim()} using ${templateName}`,
      })
    } catch (error: any) {
      console.error('Error sending test email:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to send test email: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setSendingTest(false)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/admin/email-templates?id=${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized - Admin access required')
        }
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to delete template: ${response.statusText}`)
      }

      // Reload templates list
      await loadAllTemplates()
      
      // Clear selection if deleted template was selected
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId(null)
        setIsCreatingNew(false)
        setTemplate(null)
        setSubject('')
        setHtmlContent('')
      }

      setDeletingTemplateId(null)
      setModalState({
        isOpen: true,
        type: 'success',
        title: 'Success',
        message: 'Template deleted successfully!',
      })
      
      if (onTemplateChange) {
        onTemplateChange()
      }
    } catch (error: any) {
      console.error('Error deleting template:', error)
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: 'Failed to delete template: ' + (error.message || 'Unknown error'),
      })
    } finally {
      setDeleting(false)
    }
  }

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading templates...</span>
      </div>
    )
  }

  // Filter templates based on filters
  const filteredTemplates = templates.filter((t) => {
    const nameMatch = !templateFilters.name || 
      t.template_type?.toLowerCase().includes(templateFilters.name.toLowerCase())
    const subjectMatch = !templateFilters.subject || 
      t.subject?.toLowerCase().includes(templateFilters.subject.toLowerCase())
    return nameMatch && subjectMatch
  })

  return (
    <div className="space-y-4">
      {/* Templates List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Email Templates ({filteredTemplates.length}{filteredTemplates.length !== templates.length ? ` of ${templates.length}` : ''})
          </label>
          <button
            onClick={handleCreateNew}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Template
          </button>
        </div>

        {/* Filter Section */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="Filter by template name..."
                value={templateFilters.name}
                onChange={(e) => setTemplateFilters({ ...templateFilters, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Subject Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                placeholder="Filter by subject..."
                value={templateFilters.subject}
                onChange={(e) => setTemplateFilters({ ...templateFilters, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Clear Filters Button */}
          {(templateFilters.name || templateFilters.subject) && (
            <div className="mt-3">
              <button
                onClick={() => setTemplateFilters({ name: '', subject: '' })}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
        
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {templates.length === 0 
                  ? 'No templates yet. Create your first template!'
                  : 'No templates match the current filters.'}
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Template Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Subject</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTemplates.map((t) => (
                    <tr
                      key={t.id}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedTemplateId === t.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSelectTemplate(t.id)}
                    >
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {t.template_type}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 truncate max-w-xs">
                        {t.subject}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingTemplateId(t.id)
                          }}
                          className="text-red-600 hover:text-red-800 font-medium"
                          title="Delete template"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Template Editor */}
      {(selectedTemplateId || isCreatingNew) && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          {isCreatingNew && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., task_completion, account_suspension, etc."
              />
              <p className="mt-1 text-xs text-gray-500">
                Use lowercase letters, numbers, underscores, hyphens, or spaces
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content
            </label>
            <EmailTemplateEditor
              value={htmlContent}
              onChange={setHtmlContent}
              height={400}
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isCreatingNew ? 'Create Template' : 'Save Template'}
            </button>
            {!isCreatingNew && (
              <button
                onClick={() => {
                  setSelectedTemplateId(null)
                  setIsCreatingNew(false)
                  setTemplate(null)
                  setSubject('')
                  setHtmlContent('')
                }}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Send Email Section */}
          {users.length > 0 && onSendWelcomeEmail && onSendFreeFormEmail && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Send Email</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFreeFormEmailMode(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      !freeFormEmailMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Template Email
                  </button>
                  <button
                    onClick={() => setFreeFormEmailMode(true)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      freeFormEmailMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Free Form Email
                  </button>
                </div>
              </div>

              {!freeFormEmailMode ? (
                // Template-based email section
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select User
                    </label>
                    <select
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={selectedUserForEmail}
                      onChange={(e) => setSelectedUserForEmail(e.target.value)}
                    >
                      <option value="">-- Select a user --</option>
                      {users
                        .sort((a, b) => {
                          const nameA = (a.full_name || a.email || '').toLowerCase()
                          const nameB = (b.full_name || b.email || '').toLowerCase()
                          return nameA.localeCompare(nameB)
                        })
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email} ({user.email}) {user.is_helper ? '[Helper]' : '[Tasker]'}
                          </option>
                        ))}
                    </select>
                  </div>
                  
                  {selectedUserForEmail && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Select Email Template
                        </label>
                        <select
                          className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={selectedEmailTemplate}
                          onChange={(e) => setSelectedEmailTemplate(e.target.value)}
                        >
                          <option value="">-- Select a template --</option>
                          {emailTemplates.map((template) => (
                            <option key={template.id} value={template.template_type}>
                              {template.template_type} - {template.subject}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onSendWelcomeEmail(selectedUserForEmail, selectedEmailTemplate)}
                        disabled={sendingEmail || !selectedEmailTemplate}
                      >
                        {sendingEmail ? 'Sending...' : 'Send Email'}
                      </button>
                      <p className="text-sm text-gray-600">
                        💡 <strong>Tip:</strong> Make sure you've created and saved the email templates above before sending emails.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Free-form email section
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Recipient
                    </label>
                    <select
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={freeFormRecipient}
                      onChange={(e) => setFreeFormRecipient(e.target.value)}
                    >
                      <option value="">-- Select a user --</option>
                      {users
                        .sort((a, b) => {
                          const nameA = (a.full_name || a.email || '').toLowerCase()
                          const nameB = (b.full_name || b.email || '').toLowerCase()
                          return nameA.localeCompare(nameB)
                        })
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.email} ({user.email}) {user.is_helper ? '[Helper]' : '[Tasker]'}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email subject"
                      value={freeFormSubject}
                      onChange={(e) => setFreeFormSubject(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Content
                    </label>
                    <EmailTemplateEditor
                      value={freeFormContent}
                      onChange={setFreeFormContent}
                      height={300}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      💡 You can use HTML formatting. Available variables: {'{{user_name}}'}, {'{{user_email}}'}, {'{{tee_image}}'} (mascot)
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => onSendFreeFormEmail(freeFormRecipient, freeFormSubject, freeFormContent)}
                      disabled={sendingEmail || !freeFormRecipient || !freeFormSubject.trim() || !freeFormContent.trim()}
                    >
                      {sendingEmail ? 'Sending...' : 'Send Email'}
                    </button>
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-medium"
                      onClick={() => {
                        setFreeFormSubject('')
                        setFreeFormContent('')
                        setFreeFormRecipient('')
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Email Section */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Send Test Email</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Template to Test (or use current editor content)
                </label>
                <select
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                  value={selectedTestTemplateId}
                  onChange={(e) => setSelectedTestTemplateId(e.target.value)}
                >
                  <option value="">Use Current Editor Content</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.template_type} - {t.subject}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Test Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="lou@schillaci.me"
                  />
                </div>
                <button
                  onClick={sendTestEmail}
                  disabled={sendingTest || (selectedTestTemplateId ? !testTemplateContent : (!subject.trim() || !htmlContent.trim()))}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {sendingTest ? 'Sending...' : 'Send Test Email'}
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              {selectedTestTemplateId 
                ? `Testing template: ${templates.find((t: EmailTemplate) => t.id === selectedTestTemplateId)?.template_type || 'selected template'}`
                : 'Send a test email with the current template content to verify how it looks'}
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTemplateId && (
        <StandardModal
          isOpen={!!deletingTemplateId}
          onClose={() => setDeletingTemplateId(null)}
          type="warning"
          title="Delete Template"
          message="Are you sure you want to delete this template? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => deleteTemplate(deletingTemplateId)}
        />
      )}

      <StandardModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      />
    </div>
  )
}
